# Eliminar recurso archivado — diseño

## Contexto

En el panel admin (`app/admin/(dashboard)/[country]/page.tsx`), la sección "Archivados" (líneas ~400-439) lista los recursos con `status: ARCHIVED` y ofrece dos acciones por fila: "Editar" y "Restaurar a borrador" (`restoreResource`, que siempre restaura a `DRAFT`, nunca directo a `PUBLISHED`). No existe una forma de eliminar un recurso archivado de forma permanente: una vez archivado, solo puede quedarse ahí o volver a `DRAFT`.

El modelo `Resource` no tiene ninguna relación (`@relation`) de otros modelos apuntando hacia él. `CommunityReport.resourceId` es un `String?` sin FK, igual que `AuditLog.entityId`: quedan como registro histórico suelto si el recurso se borra, sin restricción de base de datos que lo impida.

Ya existe un patrón establecido para borrados permanentes en el admin: `deleteCity` / `deleteCountry` en `app/admin/(dashboard)/countries/[slug]/page.tsx`, usando el componente `ConfirmButton` (`components/admin/ConfirmButton.tsx`) para la confirmación vía modal accesible.

## Objetivo

Agregar un botón "Eliminar" en la sección de Archivados que borre el recurso definitivamente de la base de datos, con confirmación explícita, restringido a usuarios `ADMIN`.

## Diseño

### Server action

Nueva función `deleteResource` en `app/admin/(dashboard)/[country]/page.tsx`, junto a `restoreResource`:

```ts
async function deleteResource(formData: FormData) {
  'use server'
  const id = formData.get('id') as string
  const { user } = await getSession()
  if (user?.role !== 'ADMIN') return
  const resource = await prisma.resource.findUnique({ where: { id } })
  if (!resource || resource.countrySlug !== country || resource.status !== 'ARCHIVED') return
  await prisma.resource.delete({ where: { id } })
  await logAction({ userEmail: user.email, action: 'RESOURCE_DELETE', entityType: 'resource', entityId: id, entityName: resource.name, countrySlug: country })
  await touchCountry(country)
  for (const l of LOCALES) revalidatePath(`/${l}/${country}`)
  for (const l of LOCALES) revalidatePath(`/${l}`)
  revalidatePath(`/admin/${country}`)
}
```

Guardas, en orden:
1. Solo `user.role === 'ADMIN'` (no `canManageCountry`, que también deja pasar a `EDITOR`s del país — esta acción es más destructiva que archivar/restaurar).
2. El recurso debe existir y pertenecer al país de la URL (mismo patrón de "ownership guard" que `save`/`archiveResource`/`restoreResource` en este archivo).
3. El recurso debe estar en `status: ARCHIVED` — evita que alguien invoque la acción directamente (bypaseando la UI) sobre un recurso publicado o en borrador.

Sin chequeo de referencias antes del delete: no hay FK real que pueda fallar (a diferencia de `deleteCity`/`deleteCountry`, que sí necesitan el backstop de `P2003` porque `Resource.cityId` y `Resource.countrySlug` son FKs reales hacia `City`/`Country`).

`action: 'RESOURCE_DELETE'` es un valor de texto libre nuevo — `AuditLog.action` es `String`, no un enum, así que no requiere migración.

### UI

En la fila de cada recurso archivado, se agrega un tercer botón junto a "Editar" y "Restaurar a borrador", visible solo si `user.role === 'ADMIN'` (el componente ya tiene `user` disponible desde el `getSession()` de nivel de página):

```tsx
{user.role === 'ADMIN' && (
  <ConfirmButton
    action={deleteResource}
    hiddenFields={{ id: r.id }}
    label="Eliminar"
    message={`¿Eliminar "${r.name}" definitivamente? No se puede deshacer.`}
    confirmLabel="Sí, eliminar"
  />
)}
```

`ConfirmButton` ya provee el modal de confirmación (fondo oscuro, diálogo centrado, cierre con Escape o click fuera, foco en el botón "Cancelar" al abrir) — mismo componente que usan hoy "Eliminar ciudad" y "Eliminar país". El estilo por defecto del componente (`text-red-400 border-red-100`) ya es el usado para acciones destructivas en este admin.

## Fuera de alcance

- No se toca `restoreResource`, `archiveResource`, ni el formulario de "nuevo recurso"/edición.
- No se agrega un chequeo de referencias porque no existe ninguna FK real hacia `Resource`.
- No se extiende el permiso a `EDITOR`: decisión explícita del usuario, solo `ADMIN`.
- No se toca la UI para recursos en `DRAFT` o `PUBLISHED`: el botón solo aparece en la sección de Archivados, y la guarda del server action además exige `status: ARCHIVED`.

## Testing

Sin suite de tests existente para este archivo de admin (`app/admin/(dashboard)/[country]/page.tsx`). Se verificará manualmente: archivar un recurso de prueba, confirmar que el botón "Eliminar" solo aparece para un usuario `ADMIN`, confirmar el modal, y verificar que el recurso desaparece de la lista y del listado del `AuditLog`.
