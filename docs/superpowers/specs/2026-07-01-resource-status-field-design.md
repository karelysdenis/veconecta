# Estado editable en crear/editar recursos

**Fecha:** 2026-07-01
**Estado:** aprobado, pendiente de plan de implementación

## Problema

El modelo `Resource` ya tiene un campo `status` (`DRAFT` / `PUBLISHED` / `ARCHIVED`, default `DRAFT` en el schema) y la página de listado por país (`app/admin/(dashboard)/[country]/page.tsx`) ya separa "Borradores" de "Publicados" con acciones rápidas `publishResource`/`archiveResource`.

Pero el formulario de **creación** de recursos (`app/admin/(dashboard)/[country]/new/page.tsx`) fuerza `status: ResourceStatus.PUBLISHED` en el server action `create()` (línea 57) y no expone ningún campo de estado en el formulario. Resultado: todo recurso nuevo se publica de inmediato, saltándose por completo el flujo de borradores que ya existe para edición.

Además, el formulario de **edición** (`app/admin/(dashboard)/[country]/[id]/page.tsx`) sí muestra un selector de estado, pero solo es editable para `ADMIN` (líneas 137-146); `EDITOR` ve el valor fijo, sin poder cambiarlo ahí — aunque ya puede lograr el mismo efecto vía los botones "Publicar"/"Archivar" de la lista.

## Objetivo

- Todo recurso nuevo inicia en `DRAFT` por defecto.
- El formulario de creación permite cambiar el estado ahí mismo (por si se quiere publicar directo), no solo dejarlo fijo en borrador.
- Tanto `ADMIN` como `EDITOR` pueden cambiar el estado desde el propio formulario, en creación y en edición.

## Cambios

### 1. `app/admin/(dashboard)/[country]/new/page.tsx`

- Agregar el mismo componente `Sel` (ya usado en el form de editar) para el campo de estado, junto al selector de Categoría. `defaultValue={ResourceStatus.DRAFT}`. Sin restricción de rol: visible y editable para cualquier usuario autorizado a crear en ese país.
- `create()` (server action): reemplazar el `status: ResourceStatus.PUBLISHED` hardcodeado por `status: (fd.get('status') as ResourceStatus) || ResourceStatus.DRAFT` (fallback defensivo si el campo llegara vacío).
- Reutilizar `STATUSES`/`STATUS_LABELS`, duplicando la constante igual que ya se duplica `CATEGORY_LABELS` entre este archivo y `[id]/page.tsx` (patrón ya existente en el código, no se introduce una abstracción nueva para esto).

### 2. `app/admin/(dashboard)/[country]/[id]/page.tsx`

- Quitar la rama condicional `user.role === 'ADMIN' ? <Sel estado editable> : <texto fijo>` (líneas 137-146). El selector de estado queda siempre editable, sin importar el rol.
- `save()` (server action): quitar el guard `isAdmin` sobre `newStatus` (líneas 69-70, 78). Cualquier usuario que pase el guard de país (`user.role === 'EDITOR' && !user.countrySlugs.includes(country)`) puede cambiar el estado.

### Sin cambios

- `verifiedAt`/`verifiedBy` ("confirmado por"): sigue siendo exclusivo de `ADMIN`. Es un concepto distinto (verificación de veracidad del dato) del estado de publicación, y no está en el alcance de este cambio.
- Botones "Publicar"/"Archivar" de la lista del país (`publishResource`/`archiveResource`): sin cambios. Ya eran accesibles para `EDITOR` (solo validan país, no rol), así que no hay cambio de permisos ahí — quedan como atajo redundante pero cómodo junto al nuevo selector inline.
- El guard de país por `EDITOR` (`user.countrySlugs.includes(country)`) sigue siendo el límite real de autorización en ambos server actions, sin tocar.

## Fuera de alcance (para una sesión futura, se corrige en código, no solo se documenta)

Durante la investigación se encontraron rutas REST huérfanas (`app/api/resources/route.ts` y `app/api/resources/[id]/route.ts`) con un bug real: el `PATCH` resetea `status` a `DRAFT` en cada edición, incondicionalmente. Se confirmó que ningún código del proyecto las invoca (búsqueda de `fetch`/imports sobre `/api/resources` sin resultados fuera de los tipos autogenerados de Next.js) — están huérfanas, no forman parte del flujo de admin actual. No se tocan en este cambio.

## Testing

Verificación manual en navegador (no hay suite de tests automatizados para el admin):
1. Crear un recurso sin tocar el selector de estado → queda en "Borradores" en la lista del país.
2. Crear un recurso cambiando el selector a "Publicado" antes de guardar → aparece directo en "Publicados".
3. Con un usuario `EDITOR` (no `ADMIN`): editar un recurso de su país asignado y cambiar su estado → el cambio se guarda.
4. `tsc --noEmit` limpio tras los cambios.
