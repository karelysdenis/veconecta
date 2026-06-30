# Ciclo de revisión diaria de recursos temporales — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que confirmar un recurso temporal renueve su vigencia 5 días, que la lista del país muestre un badge de días por recurso, y que la página de revisión opere sobre temporales ordenados por urgencia.

**Architecture:** Dos archivos modificados. `[country]/page.tsx` recibe el fix del bug de publish + badge visual por recurso + contador urgentes en el botón Revisar. `[country]/review/page.tsx` cambia el query a solo temporales, renueva `expiresAt` al confirmar, y renombra el toggle.

**Tech Stack:** Next.js 16 App Router, Server Components, Server Actions, Prisma, Tailwind CSS.

## Global Constraints

- Sin cambios al schema de Prisma ni migraciones.
- Temporal = `expiresAt != null`. Permanente = `expiresAt = null`.
- Confirmar renueva `expiresAt = ahora + 5 días` (432000000 ms).
- Umbral urgente: `expiresAt <= ahora + 2 días` (172800000 ms).
- Sin archivado automático. Solo marcado visual.

---

## Task 1: Fix `publishResource` — preservar `expiresAt = null` para permanentes

**Files:**
- Modify: `app/admin/(dashboard)/[country]/page.tsx`

**Interfaces:**
- Consumes: acción `publishResource` existente en el mismo archivo
- Produce: `publishResource` preserva `null` si el recurso era permanente

### Contexto

La acción `publishResource` (líneas ~68-89) actualmente siempre sobreescribe `expiresAt` a `now + 14 días`, aunque el recurso fuera permanente (`expiresAt = null`). El fix consiste en leer `expiresAt` del recurso antes de actualizarlo.

- [ ] **Step 1: Localizar y leer la acción `publishResource` actual**

En `app/admin/(dashboard)/[country]/page.tsx` buscar la función `publishResource`. Tiene esta forma:

```tsx
async function publishResource(formData: FormData) {
  'use server'
  const id = formData.get('id') as string
  const { user } = await getSession()
  if (!user) return
  if (user.role === 'EDITOR' && !user.countrySlugs.includes(country)) return
  const now = new Date()
  const resource = await prisma.resource.update({
    where: { id },
    data: {
      status: 'PUBLISHED',
      verifiedAt: user.role === 'ADMIN' ? now : null,
      verifiedBy: user.role === 'ADMIN' ? user.email : null,
      expiresAt: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000),
    },
  })
  await logAction({ ... })
  ...
}
```

- [ ] **Step 2: Reemplazar `publishResource` con la versión corregida**

```tsx
async function publishResource(formData: FormData) {
  'use server'
  const id = formData.get('id') as string
  const { user } = await getSession()
  if (!user) return
  if (user.role === 'EDITOR' && !user.countrySlugs.includes(country)) return
  const now = new Date()
  const existing = await prisma.resource.findUnique({ where: { id }, select: { expiresAt: true } })
  const resource = await prisma.resource.update({
    where: { id },
    data: {
      status: 'PUBLISHED',
      verifiedAt: user.role === 'ADMIN' ? now : null,
      verifiedBy: user.role === 'ADMIN' ? user.email : null,
      expiresAt: existing?.expiresAt != null
        ? new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000)
        : null,
    },
  })
  await logAction({ userEmail: user.email, action: 'RESOURCE_PUBLISH', entityType: 'resource', entityId: id, entityName: resource.name, countrySlug: country })
  revalidatePath(`/es/${country}`)
  revalidatePath(`/en/${country}`)
  revalidatePath(`/pt/${country}`)
  revalidatePath('/admin')
}
```

- [ ] **Step 3: Verificar manualmente**

1. Crear un recurso sin fecha de vencimiento (dejar "Vence (fecha)" vacío) → debe crearse como PUBLISHED con `expiresAt = null`.
2. Si ese recurso queda como DRAFT (via edición), usar el botón "Publicar" → confirmar en DB que `expiresAt` sigue siendo `null`.
3. Crear un recurso con fecha de vencimiento, ponerlo en DRAFT, publicarlo → `expiresAt` debe quedar a `now + 14 días`.

- [ ] **Step 4: Commit**

```bash
git add "app/admin/(dashboard)/[country]/page.tsx"
git commit -m "fix: preserve expiresAt null for permanent resources on publish"
```

---

## Task 2: Badge de días por recurso + contador urgentes en botón Revisar

**Files:**
- Modify: `app/admin/(dashboard)/[country]/page.tsx`

**Interfaces:**
- Consumes: `published` (array de recursos con `expiresAt: DateTime | null`)
- Produce: componente `DaysLeft` actualizado; variable `urgentCount`; botón Revisar usa `urgentCount`

### Contexto

El componente `DaysLeft` actual solo muestra badge si `days <= 7`. Debe mostrar badge para todos los temporales con tres colores. El botón "Revisar" muestra `unverifiedCount` — debe pasar a `urgentCount` (temporales con `expiresAt <= ahora + 2 días`).

- [ ] **Step 1: Reemplazar el componente `DaysLeft`**

Buscar la función `DaysLeft` en el archivo y reemplazarla completa:

```tsx
function DaysLeft({ date }: { date: Date | null }) {
  if (!date) return null
  const days = Math.ceil((date.getTime() - Date.now()) / 86400000)
  if (days < 0) {
    return (
      <span className="text-xs font-medium px-1.5 py-0.5 rounded bg-red-100 text-red-700">
        Vencido
      </span>
    )
  }
  if (days <= 2) {
    return (
      <span className="text-xs font-medium px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">
        {days}d
      </span>
    )
  }
  return (
    <span className="text-xs font-medium px-1.5 py-0.5 rounded bg-green-100 text-green-700">
      {days}d
    </span>
  )
}
```

- [ ] **Step 2: Añadir `urgentCount` y actualizar el botón Revisar**

En la función `AdminCountryPage`, buscar la línea:

```tsx
const unverifiedCount = published.filter((r) => !r.verifiedAt).length
```

Reemplazar con:

```tsx
const urgentCount = published.filter(
  (r) => r.expiresAt !== null && r.expiresAt <= new Date(Date.now() + 2 * 86400000)
).length
```

Luego buscar en el JSX el botón Revisar (tiene `unverifiedCount` en el badge):

```tsx
{unverifiedCount > 0 && (
  <span className="text-xs bg-orange-500 text-white px-1.5 py-0.5 rounded-full leading-none">
    {unverifiedCount}
  </span>
)}
```

Reemplazar con:

```tsx
{urgentCount > 0 && (
  <span className="text-xs bg-orange-500 text-white px-1.5 py-0.5 rounded-full leading-none">
    {urgentCount}
  </span>
)}
```

- [ ] **Step 3: Verificar manualmente**

1. Abrir `/admin/[country]` con recursos publicados.
2. Un recurso permanente (`expiresAt = null`) → no debe tener badge de días.
3. Un recurso temporal con `expiresAt` en el pasado → badge rojo "Vencido".
4. Un recurso temporal con `expiresAt` entre hoy y +2 días → badge ámbar "Xd".
5. Un recurso temporal con `expiresAt` en +5 días → badge verde "5d".
6. El botón "Revisar" muestra el número de urgentes (rojo + ámbar), no el total de sin confirmar.

- [ ] **Step 4: Commit**

```bash
git add "app/admin/(dashboard)/[country]/page.tsx"
git commit -m "feat: extend DaysLeft badge to all temporals and update Revisar counter to urgentes"
```

---

## Task 3: Refocus página de revisión en temporales

**Files:**
- Modify: `app/admin/(dashboard)/[country]/review/page.tsx`

**Interfaces:**
- Consumes: `expiresAt` en todos los recursos del query
- Produce: review muestra solo temporales ordenados `expiresAt ASC`; confirm renueva `expiresAt + 5 días`; toggle "Urgentes/Todos"

### Contexto

La página `review/page.tsx` actualmente filtra por `verifiedAt: null` y usa `filter=all` para ver todos los publicados. Ahora debe filtrar por `expiresAt != null` (temporales) y en modo urgente por `expiresAt <= ahora + 2 días`.

- [ ] **Step 1: Cambiar el query de recursos**

Buscar:

```tsx
const resources = await prisma.resource.findMany({
  where: {
    countrySlug: country,
    status: 'PUBLISHED',
    ...(showAll ? {} : { verifiedAt: null }),
  },
  orderBy: [
    { expiresAt: 'asc' },
    { createdAt: 'asc' },
  ],
})
```

Reemplazar con:

```tsx
const resources = await prisma.resource.findMany({
  where: {
    countrySlug: country,
    status: 'PUBLISHED',
    expiresAt: showAll
      ? { not: null }
      : { lte: new Date(Date.now() + 2 * 86400000) },
  },
  orderBy: [
    { expiresAt: 'asc' },
    { createdAt: 'asc' },
  ],
})
```

- [ ] **Step 2: Actualizar contadores**

Buscar:

```tsx
const total = resources.length
const unverifiedCount = showAll
  ? resources.filter((r) => !r.verifiedAt).length
  : total
```

Reemplazar con:

```tsx
const total = resources.length
const urgentCount = showAll
  ? resources.filter((r) => r.expiresAt! <= new Date(Date.now() + 2 * 86400000)).length
  : total
```

- [ ] **Step 3: Actualizar la acción `confirm` para renovar `expiresAt`**

Buscar el bloque `data:` dentro de la acción `confirm`:

```tsx
data: { verifiedAt: new Date(), verifiedBy: user.email },
```

Reemplazar con:

```tsx
data: {
  verifiedAt: new Date(),
  verifiedBy: user.email,
  expiresAt: new Date(Date.now() + 5 * 86400000),
},
```

- [ ] **Step 4: Actualizar el estado vacío (total === 0)**

Buscar:

```tsx
{showAll
  ? 'No hay recursos publicados en este país.'
  : '¡Todos los recursos publicados están confirmados!'}
```

Reemplazar con:

```tsx
{showAll
  ? 'No hay recursos temporales en este país.'
  : '¡Sin urgentes! Todos los temporales tienen vigencia suficiente.'}
```

Y el link "Ver todos":

```tsx
{!showAll && (
  <Link
    href={`/admin/${country}/review?filter=all`}
    className="inline-block text-sm text-blue-600 hover:underline"
  >
    Ver todos los publicados →
  </Link>
)}
```

Reemplazar con:

```tsx
{!showAll && (
  <Link
    href={`/admin/${country}/review?filter=all`}
    className="inline-block text-sm text-blue-600 hover:underline"
  >
    Ver todos los temporales →
  </Link>
)}
```

- [ ] **Step 5: Actualizar badge del header de controles**

Buscar:

```tsx
{unverifiedCount > 0 && (
  <span className="text-xs text-orange-700 bg-orange-50 border border-orange-200 px-2 py-0.5 rounded">
    {unverifiedCount} sin confirmar
  </span>
)}
{unverifiedCount === 0 && showAll && (
  <span className="text-xs text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded">
    Todos confirmados
  </span>
)}
```

Reemplazar con:

```tsx
{urgentCount > 0 && showAll && (
  <span className="text-xs text-orange-700 bg-orange-50 border border-orange-200 px-2 py-0.5 rounded">
    {urgentCount} urgentes
  </span>
)}
{urgentCount === 0 && showAll && (
  <span className="text-xs text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded">
    Todos al día
  </span>
)}
```

- [ ] **Step 6: Reemplazar bloque `{/* Expiry */}` con indicador prominente**

El archivo ya tiene un bloque `{/* Expiry */}` dentro de la card (buscar el comentario). Reemplazarlo completo con:

```tsx
{/* Expiry */}
{resource.expiresAt && (() => {
  const days = Math.ceil((resource.expiresAt!.getTime() - Date.now()) / 86400000)
  return (
    <div className={`text-sm font-medium px-3 py-2 rounded-lg text-center ${
      days < 0
        ? 'bg-red-50 text-red-700 border border-red-200'
        : days <= 2
        ? 'bg-amber-50 text-amber-700 border border-amber-200'
        : 'bg-green-50 text-green-700 border border-green-200'
    }`}>
      {days < 0
        ? `Vencido hace ${Math.abs(days)} día${Math.abs(days) !== 1 ? 's' : ''}`
        : days === 0
        ? 'Vence hoy'
        : `Vence en ${days} día${days !== 1 ? 's' : ''}`}
    </div>
  )
})()}
```

- [ ] **Step 7: Renombrar toggle Urgentes / Todos**

Buscar el componente `FilterToggle` y reemplazar las etiquetas:

```tsx
function FilterToggle({
  country,
  showAll,
  idx,
}: {
  country: string
  showAll: boolean
  idx: number
}) {
  return (
    <div className="flex text-xs rounded-lg border border-gray-200 overflow-hidden">
      <Link
        href={`/admin/${country}/review?i=0`}
        className={`px-3 py-1.5 ${!showAll ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-gray-50'}`}
      >
        Urgentes
      </Link>
      <Link
        href={`/admin/${country}/review?i=0&filter=all`}
        className={`px-3 py-1.5 ${showAll ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-gray-50'}`}
      >
        Todos
      </Link>
    </div>
  )
}
```

- [ ] **Step 8: Verificar manualmente**

1. Entrar a `/admin/[country]/review` sin `filter=all` → solo muestra temporales con `expiresAt <= ahora + 2 días` (urgentes). Ordenados de más vencido a menos.
2. Cambiar a "Todos" → muestra todos los temporales, permanentes ausentes.
3. Confirmar un recurso → su `expiresAt` queda a `ahora + 5 días`, desaparece de la vista "Urgentes", permanece en "Todos" con badge verde.
4. Badge del botón "Revisar" en la lista del país refleja el nuevo count de urgentes.
5. Estado vacío en "Urgentes" cuando no hay urgentes muestra mensaje correcto.

- [ ] **Step 9: Commit**

```bash
git add "app/admin/(dashboard)/[country]/review/page.tsx"
git commit -m "feat: refocus review page on temporals, confirm renews expiresAt +5 days, toggle Urgentes/Todos"
```

---

## Task 4: Push y deploy

- [ ] **Step 1: Push**

```bash
git push origin master
```

- [ ] **Step 2: Deploy a producción**

```bash
vercel --prod
```

- [ ] **Step 3: Verificar en producción**

Navegar a `/admin/[country]/review` en veconecta.org y confirmar que el flujo funciona end-to-end con datos reales.
