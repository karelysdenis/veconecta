# Relevancia en búsqueda + dominio visible en tarjetas

## Contexto

El usuario reportó que al buscar en `/buscar` un recurso conocido (la campaña de GoFundMe "I Love Venezuela Foundation") el resultado esperado no aparece primero. Investigando: ni `/api/search` (usado por el buscador rápido del header, `SearchOverlay`) ni `/buscar` (página completa de búsqueda) ordenan por relevancia. Ambos usan `orderBy: { createdAt: 'asc' }`: el recurso más antiguo gana, sin importar si el término matchea el nombre completo o solo aparece de paso en una nota en otro idioma.

Además, ninguna de las tres vistas que listan recursos (`ResourceLink` en las páginas de país/categoría, `SearchResultLink` en `/buscar`, y `ResultRow` dentro de `SearchOverlay`) muestra el dominio del enlace externo. El usuario tiene que entrar al detalle del recurso (`/recursos/[id]`, que sí muestra la URL vía `cleanUrlDisplay`) para verificar a qué sitio apunta antes de decidir si confía en él. En un hub de ayuda de emergencia con organizaciones de nombres parecidos, esa falta de transparencia previa al clic es un problema de confianza, no solo de UX.

## Alcance

1. Ranking por relevancia en ambos puntos de búsqueda (`/api/search` y `/buscar`), centralizando la query hoy duplicada entre los dos.
2. Dominio visible como subtítulo en las 3 vistas que listan recursos: `ResourceLink`, `SearchResultLink`, `ResultRow` (dentro de `SearchOverlay`).

**Fuera de alcance (explícitamente, para la próxima sesión):** fusionar `ResourceLink`/`SearchResultLink`/`ResultRow` en un solo componente compartido. Los tres ya eran casi idénticos entre sí antes de este cambio; este trabajo los toca pero no los consolida — eso queda como el siguiente paso, ya acordado con el usuario.

## Arquitectura

### `lib/search.ts` (nuevo) — query centralizada

Hoy `app/api/search/route.ts` y `app/[locale]/buscar/page.tsx` tienen cada uno su propia versión de: la query de países que matchean el nombre, la query de recursos (mismo `where`/`OR` sobre `name`/`notes` en los 5 idiomas, mismo filtro `notPastEventFilter()`, mismo `select` de campos), y el fallback a recursos globales cuando no hay resultados. Se extrae una sola función:

```ts
export async function searchResources({
  query,
  locale,
}: {
  query: string
  locale: string
}): Promise<{
  results: RankedResource[]
  fallback: RankedResource[]
  countries: MatchingCountry[]
}>
```

que hace la query Prisma (con `url: true` agregado al `select`, que hoy falta en los dos) y aplica el ranking antes de devolver. `app/api/search/route.ts` y `app/[locale]/buscar/page.tsx` quedan como wrappers delgados: arman los `searchParams`, llaman `searchResources`, y renderizan. Esto asegura que un fix de ranking futuro se aplique una sola vez, no en dos sitios que puedan desincronizarse (el mismo patrón de riesgo que ya se vio en la auditoría de la cola de revisión).

### `lib/search-rank.ts` (nuevo) — ranking puro y testeable

Función pura, sin acceso a base de datos, mismo espíritu que `sortForReview` en `lib/resource-review.ts`:

```ts
export function rankSearchResults<T extends RankableResource>(
  results: T[],
  query: string,
  locale: Locale,
): T[]
```

Clasifica cada recurso en un nivel (0 = mejor match, 4 = peor) según dónde aparece el término de búsqueda, priorizando el idioma activo del visitante:

- **Nivel 0:** el nombre en el idioma del visitante empieza con el término (case-insensitive).
- **Nivel 1:** el nombre en el idioma del visitante contiene el término en cualquier posición.
- **Nivel 2:** el nombre en cualquier otro idioma contiene el término.
- **Nivel 3:** las notas en el idioma del visitante contienen el término.
- **Nivel 4:** las notas en cualquier otro idioma contienen el término.

Un recurso que matchea por varios criterios se queda con el nivel más bajo (mejor) que alcance. Dentro de un mismo nivel, se preserva el orden que ya traían los resultados (que sigue viniendo de la DB ordenado por `createdAt: 'asc'`) — desempate estable, sin sorpresas de orden dentro de un empate de relevancia.

`searchResources` en `lib/search.ts` llama `rankSearchResults` sobre `results` y sobre `fallback` antes de devolverlos (el fallback también se beneficia: si hay varios recursos globales, los que matchean mejor deberían ir primero, aunque ese caso es menos común).

### `lib/format-url.ts` — nuevo helper `urlHost`

Junto al `cleanUrlDisplay` ya existente (host + ruta, usado en la página de detalle donde hay más espacio), se agrega:

```ts
/** Bare hostname for compact card display (no path, no query/hash). */
export function urlHost(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url.replace(/^https?:\/\//, '').replace(/\/.*$/, '')
  }
}
```

Usado por los 3 componentes de tarjeta (no por la página de detalle, que sigue usando `cleanUrlDisplay`).

### Cambios en los 3 componentes de tarjeta

`ResourceLink.tsx`, `SearchResultLink.tsx`, y el `ResultRow` interno de `SearchOverlay.tsx` reciben cada uno la misma adición pequeña: un `<p>` con `urlHost(resource.url)` entre el nombre y las notas, solo si `resource.url` existe. Cada uno necesita además que su tipo de prop (`SerializedResource` ya lo tiene; `ResourceWithCountry` en `SearchResultLink.tsx` y `Result` en `SearchOverlay.tsx` no) incluya `url: string | null`.

## Fuera de alcance

- Full-text search de Postgres (`tsvector`/`ts_rank`) — se evalúa si el catálogo crece mucho; con el volumen actual (decenas a ~150 recursos) el ranking por niveles alcanza.
- Fusión de `ResourceLink`/`SearchResultLink`/`ResultRow` en un componente compartido — próxima sesión.
- Badge de estado de enlace (🟢/🔴) en las tarjetas públicas — esa infraestructura (`checkUrl`) es de uso administrativo bajo demanda; correrla en cada carga de página pública sería otro costo de red por visitante, no se evalúa aquí.

## Testing

- `lib/search-rank.ts`: tests unitarios puros (sin DB) cubriendo cada nivel, el desempate estable, y la priorización de idioma (un match en `notesFr` no debe superar a un match en `notesEs` cuando `locale === 'es'`).
- `lib/format-url.ts`: test para `urlHost` (con y sin `www.`, URL inválida como fallback).
- `tsc --noEmit` limpio, `vitest run` completo.
- Verificación manual (Playwright) en `/buscar`, el overlay del header, y una página de país: buscar el término del GoFundMe y confirmar que aparece primero en su categoría; confirmar que el dominio se ve en las 3 vistas.
