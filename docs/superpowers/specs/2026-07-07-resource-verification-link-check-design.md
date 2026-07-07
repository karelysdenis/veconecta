# Chequeo automático de enlaces en la cola de revisión — Diseño

**Fecha:** 2026-07-07
**Rama:** por definir (rama actual `feature/admin-resource-import` está enfocada en el import; esta feature debería ir en una rama propia)
**Origen:** el usuario pidió mejorar el proceso de verificación de recursos (`/admin/review`, `/admin/[country]/review`). Dos problemas concretos, elegidos entre varias opciones:
1. La verificación hoy es un click de confianza: "Confirmar info" solo pone `verifiedAt`/`verifiedBy`, sin comprobar que el enlace siga vivo.
2. La cola no prioriza (orden puramente por `verifiedAt` asc/nulls-first) ni da visibilidad de cuánto hay atrasado más allá de un contador total.

## Objetivo

Cuando un ADMIN/EDITOR abre la cola de revisión, el sistema comprueba en vivo el estado de la `url` de cada recurso pendiente, usa eso para priorizar (enlaces rotos primero) y lo muestra como badge en cada tarjeta, sin necesidad de que el editor abra el link a mano para saber si hay algo que arreglar. No se persiste nada en base de datos: todo se recalcula cada vez que se entra a la cola o se navega a un recurso.

Fuera de alcance (explícitamente descartado en la conversación):
- Cron/job periódico que precalcule y persista el estado de los enlaces — el usuario prefirió el chequeo en vivo por simplicidad, sin infraestructura nueva.
- Cambios al dashboard principal (`/admin`) — el chequeo en vivo aplica solo a las páginas de cola de revisión, no a cada carga del dashboard (que se visita con mucha más frecuencia).
- Chequeo de `phone`/`paymentKey` — no son verificables automáticamente por HTTP.
- Unificar los umbrales de `VerificationBadge.tsx` (5/14 días) con `REVIEW_CYCLE_DAYS` (7 días) — inconsistencia detectada durante la exploración pero no es uno de los dolores elegidos; no se toca en esta feature.

## 1. `lib/link-check.ts` — chequeo puro de una URL

```ts
export type LinkStatus = 'ok' | 'broken' | 'unknown'

export async function checkUrl(url: string, timeoutMs = 5000): Promise<LinkStatus>
```

- Intenta `HEAD` primero. Si la respuesta es `405` (Method Not Allowed) o falla, reintenta con `GET`.
- `2xx`/`3xx` (tras seguir redirects, comportamiento por defecto de `fetch`) → `ok`.
- `4xx`/`5xx` → `broken`.
- Timeout (`AbortController`, `timeoutMs` por defecto 5s) o error de red/DNS/TLS → `unknown` (no se trata como roto: evita falsos positivos por caídas transitorias del lado del sitio de destino, no del recurso en sí).
- Se envía un header `User-Agent` genérico de navegador, porque algunos sitios bloquean requests sin uno.

Esta función es pura (una sola llamada de red por invocación) y testeable mockeando `fetch` global.

## 2. `lib/resource-review.ts` — anotar y priorizar el lote

Se añaden dos funciones nuevas junto a la ya existente `fetchResourcesByIds`:

```ts
export type ResourceWithLinkStatus<T> = T & { linkStatus: LinkStatus | 'none' }

export async function annotateWithLinkStatus<T extends { url: string | null }>(
  resources: T[],
): Promise<ResourceWithLinkStatus<T>[]>

export function sortForReview<T extends { linkStatus: LinkStatus | 'none' }>(
  resources: T[],
): T[]
```

- `annotateWithLinkStatus`: ejecuta `checkUrl` en paralelo (`Promise.all`) solo para los recursos con `url` no vacío; los que no tienen `url` quedan anotados como `'none'`.
- `sortForReview`: recursos con `linkStatus === 'broken'` primero; el resto conserva el orden relativo que ya traía (el de `verifiedAt` asc/nulls-first, `createdAt` asc, calculado antes por la query de Prisma). `'unknown'` y `'none'` no se tratan como prioritarios.

Ambas son puras y testeables sin tocar Prisma ni red real (mockeando `checkUrl`/`fetch`).

## 3. Integración en las páginas de revisión

En `app/admin/(dashboard)/review/page.tsx` y `app/admin/(dashboard)/[country]/review/page.tsx`:

- **Al construir la cola sin snapshot** (rama `!idsParam`, antes del `redirect` a `?ids=...`): tras obtener `resources` de Prisma, se llama `annotateWithLinkStatus` y luego `sortForReview`, y el `redirect` usa el orden ya resuelto (`ids=` refleja el nuevo orden, no el de la query original).
- **Al mostrar un recurso individual** (con `idsParam` ya presente, en cualquier punto de la navegación anterior/siguiente): se llama `checkUrl(resource.url)` una sola vez, solo para el recurso actualmente mostrado, y el resultado se pasa al badge de la tarjeta. Esto mantiene el estado "en vivo" mientras el editor navega, sin volver a chequear todo el lote en cada clic de "Siguiente".
- Recursos sin `url`: no se llama a `checkUrl`, el badge no se muestra.

## 4. Cambios de UI

**Nuevo componente `components/admin/LinkStatusBadge.tsx`** (mismo patrón que `VerificationBadge.tsx`):

| Estado | Badge |
|---|---|
| `ok` | 🟢 Enlace OK |
| `broken` | 🔴 Enlace roto |
| `unknown` | ⚪ No se pudo comprobar |
| `none` (sin URL) | *(no se renderiza)* |

Se coloca junto al badge existente de `verifiedAt` en la tarjeta de recurso, en ambas páginas de revisión.

**Resumen con desglose**, reemplazando el texto actual `"{pendingCount} sin confirmar"` por algo con más detalle, por ejemplo:

```
12 pendientes · 3 nunca verificados · 2 enlaces rotos
```

(nunca verificados = `verifiedAt === null`; enlaces rotos = `linkStatus === 'broken'` dentro del lote actual).

**`loading.tsx`**: se añade (si no existe ya) para `app/admin/(dashboard)/review/` y `app/admin/(dashboard)/[country]/review/`, porque el chequeo en paralelo de todo el lote puede tardar unos segundos con colas grandes antes del redirect.

## 5. Manejo de errores y casos límite

- `unknown` (timeout/error de red) nunca cuenta como `broken` en el resumen ni en el orden — solo se muestra como aviso neutro en el badge.
- El toggle "Urgentes"/"Todos" de la página por país sigue funcionando igual; el reordenado por enlace roto aplica en ambos filtros.
- Si `annotateWithLinkStatus` falla por completo (no debería, cada `checkUrl` atrapa sus propios errores) el comportamiento por defecto es no romper la página: cualquier recurso sin resultado de chequeo se trata como `'unknown'`.
- El re-chequeo individual al navegar puede dar un resultado distinto al que tenía ese recurso durante el chequeo por lote (normal: el sitio externo pudo cambiar de estado entre medio); no hay necesidad de reconciliar, cada vista es independiente.

## 6. Testing

- `tests/lib/link-check.test.ts`: `checkUrl` con `fetch` mockeado — casos `200 OK`, `404`, `405` con fallback a GET, `AbortError`/timeout, error de red genérico.
- `tests/lib/resource-review.test.ts` (extender el archivo existente si ya hay, o crear): `annotateWithLinkStatus` con `checkUrl` mockeado, y `sortForReview` puro (sin red) verificando que los `broken` van primero y el resto conserva orden relativo.
- Las páginas de revisión (`review/page.tsx`, `[country]/review/page.tsx`) siguen sin test unitario, consistente con la convención ya usada en el resto del código de páginas de admin (Server Components con `redirect`/mutaciones inline).
- Verificación manual E2E con Playwright MCP contra la DB local: al menos un recurso con URL rota (ej. apuntando a un dominio que devuelve 404) y uno con URL válida, confirmando que el roto aparece primero y con el badge correcto.
