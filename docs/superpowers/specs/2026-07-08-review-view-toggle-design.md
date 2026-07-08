# Toggle de vista en la cola de revisión: lista apilada vs. uno a uno

## Contexto

Las dos colas de revisión (`/admin/review` global y `/admin/[country]/review` por país) solo ofrecen hoy una vista "uno a uno": una tarjeta por pantalla, navegación Anterior/Siguiente, barra de progreso. El usuario quiere una alternativa de **lista apilada**, donde todos los recursos de la cola se ven de una vez y se puede confirmar/archivar cualquiera sin navegar tarjeta por tarjeta, más un toggle para alternar entre ambas vistas.

Las dos páginas de revisión son casi idénticas en código (misma tarjeta, mismos labels, mismo `FilterToggle`). Esto ya estaba anotado como deuda técnica (DT-5: extraer `Flag`/`CATEGORY_LABELS` a un archivo compartido). Agregar la vista de lista sin resolver esa duplicación cuadruplicaría el markup de la tarjeta (2 páginas × 2 vistas); por eso el refactor de extracción es parte de este trabajo, no un extra.

## Alcance

Aplica a ambas páginas de revisión (global y por país), con el mismo comportamiento en las dos.

## Arquitectura

### Componentes/archivos nuevos

- **`components/admin/resource-review-constants.ts`**: `CATEGORY_LABELS`, `STATUS_LABELS`, `STATUS_STYLES`, `isToday()`, `Flag` (el componente que resuelve `cca2`/`flagUrl`). Hoy están duplicados en ambas páginas; se centralizan aquí.
- **`components/admin/ResourceReviewCard.tsx`**: la tarjeta completa de recurso (meta badges, nombre con EN/PT, URL + `LinkStatusBadge`, contacto/dirección/horario, vigencia editorial, notas, acciones Archivar/Editar/Confirmar). Recibe el `resource` ya anotado con `linkStatus`, las server actions `confirm`/`archive` con sus hidden fields ya resueltos, el `editHref`, y un prop opcional `country` (`{ slug, nameEs, cca2, flag } | null`) que, cuando viene, muestra el bloque de bandera + nombre de país (solo lo usa la cola global).
- **`lib/review-view.ts`**: `getReviewViewMode()` (lee la cookie `review_view` vía `cookies()` de `next/headers`, devuelve `'list' | 'one'`, default `'one'`) y `setReviewViewMode` (server action, `'use server'` a nivel de función, fija la cookie y redirige de vuelta preservando `ids`/`filter`/`broken`).
- **`components/admin/ViewToggle.tsx`**: pill de dos botones ("☰ Lista" / "🗂 Uno a uno"), mismo estilo visual que `FilterToggle` pero implementado con dos `<form>` (uno por opción) que llaman a `setReviewViewMode`, porque muta una cookie en vez de solo navegar.

### Cambios en las páginas existentes

Ambas páginas (`[country]/review/page.tsx` y `review/page.tsx`) mantienen toda su lógica actual de query (snapshot `ids=`, filtro Urgentes/Todos/Rotos, `dueForReviewFilter`, `sortForReview`). Lo que cambia:

1. Leen `getReviewViewMode()` además de los `searchParams` actuales.
2. Los controles de arriba (contador, badges pendientes/rotos, `FilterToggle`) ganan el `ViewToggle` al lado.
3. Debajo de los controles, renderizan condicionalmente:
   - **Modo `one`** (comportamiento actual, sin cambios funcionales): barra de progreso + `<ResourceReviewCard>` del recurso en `idx` + navegación Anterior/Siguiente.
   - **Modo `list`** (nuevo): sin barra de progreso ni Anterior/Siguiente, mapea todo `resources` renderizando un `<ResourceReviewCard>` por cada uno, en el mismo orden que ya trae `sortForReview` (rotos primero).
4. Las funciones `confirm`/`archive` (definidas inline como server actions, igual que hoy) agregan una rama: si `getReviewViewMode()` es `list`, no llaman `redirect()` al final: solo hacen la mutación + `logAction` + `touchCountry` + `revalidatePath`/`revalidatePath` de siempre. Si es `one`, mantienen el `redirect()` actual con `returnI`/`returnFilter`/etc.

## Comportamiento de la lista

- **Sin índice**: no hay concepto de "posición actual"; todas las tarjetas del snapshot (`ids=`) están visibles a la vez, en el orden que ya calcula `sortForReview`.
- **Confirmar/archivar en el lugar**: al no redirigir, el formulario se resuelve sin navegar: la tarjeta se actualiza (badge ✓, fecha, botón "Reconfirmar") sin saltar al inicio de la lista. El scroll se preserva razonablemente porque no hay navegación real, solo revalidación de RSC.
- **Recursos archivados** se quedan visibles en la lista (mismo comportamiento que hoy: el snapshot por `ids=` no filtra por `status`), con el botón "Archivar" oculto y el badge "Archivado".
- **Editar**: el link "Editar" de cada tarjeta pasa `returnTo` igual que hoy (`ids`/`filter`/`broken`, sin `i=` porque no aplica en modo lista); al volver, la cookie ya recuerda que el modo es `list`, así que reaparece la misma vista.

## Chequeo de enlaces en modo lista

Hoy `checkUrl` se llama una sola vez por render, solo para el recurso que se está viendo. En modo lista hace falta el estado de enlace de **todas** las tarjetas visibles a la vez, así que la página llama `annotateWithLinkStatus(resources)` (ya existe, se usa igual al construir el snapshot inicial) sobre el snapshot completo cada vez que la lista se renderiza: incluida cada recarga tras confirmar o archivar una tarjeta.

**Decisión explícita:** se re-chequean todos los enlaces visibles en cada recarga (no solo al entrar), consistente con la filosofía actual de "sin persistir nada, siempre en vivo". Con el volumen actual (máximo ~60 recursos en la cola global con filtro "Todos") esto puede tomar 1-3s por recarga en listas grandes; se acepta como trade-off conocido, no se resuelve en este trabajo.

## Persistencia del toggle

- Cookie `review_view` (`list` | `one`, sin `httpOnly` estricto, no es dato sensible).
- Vive a nivel de sitio, no por país ni por página: cambiar la vista en `/admin/spain/review` la cambia también para `/admin/review` y cualquier otro país, hasta que se vuelva a alternar.
- Default `one` si la cookie no existe (usuarios actuales no notan cambio de comportamiento hasta que prueben el toggle).

## Fuera de alcance

- Paginación de la lista (no hace falta con los volúmenes actuales).
- Selección múltiple / acciones en lote (confirmar varios recursos con un solo click).
- Persistir el `linkStatus` en base de datos para evitar el re-chequeo repetido en modo lista.
- Cambiar el comportamiento del modo "uno a uno" existente.

## Testing

- `tsc --noEmit` limpio.
- `vitest run` (suite existente, sin romper nada).
- Verificación manual end-to-end (Playwright, sesión real de magic-link) en ambas páginas de revisión: alternar el toggle, confirmar/archivar en modo lista sin salto de scroll, confirmar que la cookie persiste al navegar entre país y global, verificar que el modo "uno a uno" sigue funcionando igual que antes.
