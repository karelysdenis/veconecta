# Filtro "Rotos" en la cola de revisión — Diseño

**Fecha:** 2026-07-07
**Rama:** por definir al ejecutar (feature independiente, partir de `master`)
**Origen:** tras verificar manualmente el chequeo automático de enlaces (ver `docs/superpowers/specs/2026-07-07-resource-verification-link-check-design.md`), se detectaron 9 enlaces rotos reales en producción. El usuario pidió una forma de ver solo esos, en vez de tener que hojear toda la cola "Todos" buscándolos.

## Objetivo

Añadir una tercera pestaña **"Rotos"** al toggle que ya existe en `/admin/review` y `/admin/[country]/review` (hoy "Urgentes"/"Todos"), que muestra únicamente los recursos `PUBLISHED` cuyo `url` está detectado como roto en el momento de abrir la cola.

## 1. El parámetro `filter`

Pasa de 2 a 3 valores posibles en la querystring:

| Valor | Significado | Universo consultado |
|---|---|---|
| *(ausente)* / `urgent` | Como hoy | `PUBLISHED` + `dueForReviewFilter()` (pendientes de revisión) |
| `all` | Como hoy | Todos los `PUBLISHED` |
| `broken` | Nuevo | Todos los `PUBLISHED` (mismo universo que `all`), recortado a solo los que resultan `linkStatus === 'broken'` tras el chequeo en vivo |

`filter=broken` reutiliza el mismo universo que `all` (no el de `urgent`): un enlace roto importa aunque el recurso ya se haya confirmado hace poco.

## 2. Flujo de datos

Cuando `filter=broken` y no hay `ids=` (construcción inicial de la cola):
1. Se consulta igual que en `all` (sin `dueForReviewFilter()`).
2. Se anota con `annotateWithLinkStatus` y se ordena con `sortForReview` (sin cambios en esas funciones).
3. Antes de construir el snapshot `ids=`, el array se recorta a `resources.filter(r => r.linkStatus === 'broken')`.
4. El resto del flujo (redirect con `ids=`, `broken=N` en la querystring, navegación anterior/siguiente, confirmar/archivar) no cambia — ya funciona sobre cualquier subconjunto de recursos.

En este filtro, `brokenCount` siempre es igual a `total` (todo lo mostrado está roto), así que la pestaña no necesita lógica nueva de conteo aparte de la ya existente.

## 3. UI

- El componente de toggle (`FilterToggle` en ambas páginas) gana una tercera pestaña "Rotos" junto a "Urgentes"/"Todos", mismo estilo visual.
- Estado vacío nuevo y específico para este filtro: *"No hay enlaces rotos detectados."* (en vez de reusar el texto de "Urgentes" o "Todos").
- No hay cambios en el badge de estado del enlace, la tarjeta de recurso, ni las acciones (confirmar/archivar/editar).

## 4. Fuera de alcance

- No se toca `annotateWithLinkStatus` ni `sortForReview` (`lib/resource-review.ts`) — el recorte a "solo rotos" ocurre en las páginas, no en esas funciones puras.
- No se persiste nada nuevo en base de datos.
- No se añade este filtro a ningún otro lugar del panel de admin (solo a las dos páginas de revisión que ya tienen el toggle Urgentes/Todos).

## 5. Testing

Ambas páginas de revisión son Server Components sin test unitario, igual que el resto del código de esas páginas (convención ya establecida). Verificación manual con Playwright MCP contra la DB local: con al menos un recurso de enlace roto conocido, confirmar que la pestaña "Rotos" lo muestra y que el resto de recursos (con enlace OK) no aparecen ahí.
