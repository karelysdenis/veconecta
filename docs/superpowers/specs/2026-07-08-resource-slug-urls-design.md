# URLs con slug para iniciativas y eventos + hreflang

## Contexto

Hoy la página de detalle de un recurso vive en `/[locale]/recursos/[id]`, donde `id` es el cuid interno (ej. `cmqy7yiuo000ftrdclhohdpwn`). No es legible, no aporta nada a SEO, y no comunica si el recurso es una iniciativa permanente o un evento puntual. El usuario pidió mejorar cómo se construyen estos enlaces dado que VeConecta es, en el fondo, un directorio web.

La página de detalle tampoco tiene `hreflang` (`alternates.languages`) hoy, a diferencia de la página de país (`/[locale]/[country]/page.tsx`), que sí lo tiene desde antes.

## Decisiones de idioma (mismo criterio ya aplicado a `Country`)

El 2026-07-01 este proyecto tuvo un incidente real con slugs traducidos por idioma en `Country`/`City`: el selector de idioma reemplaza el segmento de idioma de la URL de forma ingenua, y como los slugs diferían por idioma, cambiar de idioma podía aterrizar en un slug inválido → 404. Se corrigió pasando a **un slug único, en inglés, igual en los 5 idiomas** (`/es/espana` → `/es/spain`), con la conclusión de que el slug es una señal de SEO débil comparada con el riesgo de mantenerlo traducido.

Se aplica el mismo criterio aquí:

- **Segmentos de ruta en inglés, iguales en los 5 idiomas:** `/[locale]/initiatives/[slug]` (recursos `kind !== 'EVENT'`) y `/[locale]/events/[slug]` (`kind === 'EVENT'`). No hay `/es/iniciativas/...` vs `/en/initiatives/...`: el segmento de ruta no se traduce, solo el contenido de la página.
- **El slug se genera del nombre en inglés** (`resource.nameEn`), con fallback al nombre en español (`resource.name`) si el recurso no tiene nombre en inglés cargado.
- El **contenido de la página sí está localizado** como ya lo está hoy (título, notas, metadata). Lo que cambia de idioma es lo que se lee, no la URL.

## Modelo de datos

`Resource` gana `slug String @unique` (global, no nulo tras la migración).

**Generación:** solo al crear el recurso, a partir de `slugify(resource.nameEn || resource.name)` (reusa `lib/slugify.ts`), con el mismo anti-colisión ya usado en `Post` (`app/admin/(dashboard)/updates/new/page.tsx`): si el slug ya existe, se prueba `slug-2`, `slug-3`, etc.

**Edición:** el slug queda como campo editable en el formulario de admin (`[country]/[id]/page.tsx`), igual que ya es editable en `Post`. Así, si se corrige el nombre de un recurso ya publicado, no se rompe silenciosamente la URL ya compartida. No se regenera automáticamente en cada guardado.

**Migración:** migración Prisma que agrega `slug` nullable, script de backfill que recorre los ~150 recursos existentes generando slug desde `nameEn || name` con el mismo anti-colisión, luego migración que la vuelve `NOT NULL UNIQUE`.

## Rutas nuevas

- `app/[locale]/initiatives/[slug]/page.tsx`
- `app/[locale]/events/[slug]/page.tsx`

Ambas comparten la lógica de render de la página de detalle actual (extraída a una función/componente común: el layout de la tarjeta es idéntico, solo cambia cómo se busca el recurso, por `slug` en vez de por `id`, y validando el `kind` esperado).

**Kind incorrecto para la ruta:** si un recurso cambia de `EVENT` a `PERMANENT` (o viceversa) después de compartido, la ruta "equivocada" no da 404. Busca por slug igual, detecta que el `kind` real no coincide con el prefijo de la ruta, y hace `redirect()` a la ruta correcta.

## Redirect de las URLs viejas

`/recursos/[id]` deja de renderizar el detalle: busca el recurso por `id`, arma su URL canónica actual (`/initiatives/[slug]` o `/events/[slug]`) y redirige. Si el `id` no existe, 404 (igual que hoy). Cualquier link `/recursos/[id]` ya compartido en WhatsApp/redes durante la emergencia activa sigue funcionando indefinidamente: decisión explícita del usuario dado el contexto de uso real del sitio.

## Hreflang (`alternates.languages`)

Se agrega a `generateMetadata` de las nuevas rutas, reusando exactamente el patrón ya probado en `/[locale]/[country]/page.tsx`: `effectiveLocalesForCountry()` (de `lib/locale-content.ts`) + `getActiveLocales()`/`getCountryLocaleMap()` (de `lib/locale-active.ts`) para calcular qué idiomas están realmente activos para el país del recurso, y `alternates.canonical` + `alternates.languages` construidos a partir del slug único (no cambia entre idiomas, así que el hreflang es un simple mapeo de idioma → misma URL con `/${locale}/` distinto).

## Actualizar los que enlazan al recurso

`ResourceLink`, `SearchResultLink`, `SearchOverlay` (los 3 de esta sesión) y los 2 links de preview del admin (`[country]/page.tsx`, `[country]/[id]/page.tsx`) pasan a construir la URL nueva directo (`/initiatives/[slug]` o `/events/[slug]` según `kind`), no dependen del redirect de `/recursos/[id]` (ese es solo para links externos ya compartidos).

## Fuera de alcance

- Full-text search / slugs traducidos por idioma: descartado explícitamente, ver "Decisiones de idioma" arriba.
- Sitemap.xml (no existe hoy en el proyecto): no se agrega como parte de este trabajo, aunque quedaría más fácil de construir después con slugs legibles.

## Testing

- Test unitario del anti-colisión de slug (mismo patrón que ya existiría implícitamente para `Post`, pero sin test hoy; se agrega para `Resource`).
- `tsc --noEmit` limpio, `vitest run` completo.
- Verificación manual (Playwright): crear/editar un recurso y confirmar el slug generado; visitar `/es/initiatives/[slug]` y `/es/events/[slug]`; visitar un `/recursos/[id]` viejo y confirmar el redirect; cambiar el `kind` de un recurso y confirmar que la ruta vieja redirige a la nueva; revisar el `<link rel="alternate" hreflang="...">` generado en el HTML.
