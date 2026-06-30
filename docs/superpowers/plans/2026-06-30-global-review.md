# Revisión global de urgentes — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Añadir un botón "Revisar todo" en `/admin` que lanza una cola global de recursos temporales urgentes de todos los países accesibles, card-by-card, con confirmar renovando `expiresAt +5 días`.

**Architecture:** Dos cambios. `app/admin/(dashboard)/page.tsx` agrega un query de `globalUrgentCount` y un botón "Revisar todo" visible para todos los roles. `app/admin/(dashboard)/review/page.tsx` es una nueva página que agrega todos los temporales urgentes cross-country en una cola única, sin toggle (solo urgentes), con el país de cada recurso visible en la card.

**Tech Stack:** Next.js 16 App Router, Server Components, Server Actions, Prisma, Tailwind CSS.

## Global Constraints

- Sin cambios al schema de Prisma ni migraciones.
- Temporal = `expiresAt != null`. Urgente = `expiresAt <= ahora + 2 días` (172800000 ms).
- Confirmar renueva `expiresAt = ahora + 5 días` (432000000 ms).
- ADMIN ve todos los países. EDITOR ve solo sus `user.countrySlugs`.
- Sin toggle Urgentes/Todos en la vista global — solo urgentes.
- No hay archivado automático.

---

## Task 1: globalUrgentCount + botón "Revisar todo" en admin home

**Files:**
- Modify: `app/admin/(dashboard)/page.tsx`

**Interfaces:**
- Consumes: `user.role`, `user.countrySlugs` del `getSession()` existente
- Produce: `globalUrgentCount: number` disponible en el JSX; botón `<Link href="/admin/review">` en el header

### Contexto

La página `/admin` actualmente tiene el header estructurado así:

```tsx
<div className="flex items-center justify-between mb-4">
  <h1 className="text-xl font-bold text-gray-900">Países</h1>
  {user.role === 'ADMIN' && (
    <div className="flex items-center gap-2">
      {/* Actividad, Usuarios, Nuevo país */}
    </div>
  )}
</div>
```

El botón "Revisar todo" debe ser visible para ADMIN y EDITOR. La solución: extraer el div de botones fuera del guard de ADMIN, y poner los botones admin-only dentro de un fragment condicional.

- [ ] **Step 1: Añadir query `globalUrgentCount`**

En `app/admin/(dashboard)/page.tsx`, buscar el bloque que termina con:

```tsx
  const pendingMap = Object.fromEntries(pendingGroups.map(g => [g.countrySlug, g._count._all]))
```

Añadir inmediatamente después:

```tsx
  const globalUrgentCount = await prisma.resource.count({
    where: {
      status: 'PUBLISHED',
      expiresAt: { lte: new Date(Date.now() + 2 * 86400000) },
      ...(user.role === 'EDITOR' ? { countrySlug: { in: user.countrySlugs } } : {}),
    },
  })
```

- [ ] **Step 2: Reestructurar el header**

Buscar este bloque completo en el JSX:

```tsx
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold text-gray-900">Países</h1>
          {user.role === 'ADMIN' && (
            <div className="flex items-center gap-2">
              <Link
                href="/admin/activity"
                title="Logs de actividad"
                className="border border-gray-300 text-gray-600 p-2 rounded-lg hover:bg-gray-100"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                  <line x1="16" y1="13" x2="8" y2="13"/>
                  <line x1="16" y1="17" x2="8" y2="17"/>
                  <polyline points="10 9 9 9 8 9"/>
                </svg>
              </Link>
              <Link
                href="/admin/users"
                className="text-sm border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-100"
              >
                Usuarios
              </Link>
              <Link
                href="/admin/countries/new"
                className="text-sm bg-gray-900 text-white px-4 py-2 rounded-lg hover:bg-gray-700"
              >
                + Nuevo país
              </Link>
            </div>
          )}
        </div>
```

Reemplazar con:

```tsx
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold text-gray-900">Países</h1>
          <div className="flex items-center gap-2">
            <Link
              href="/admin/review"
              className="text-sm border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 flex items-center gap-1.5"
            >
              Revisar todo
              {globalUrgentCount > 0 && (
                <span className="text-xs bg-orange-500 text-white px-1.5 py-0.5 rounded-full leading-none">
                  {globalUrgentCount}
                </span>
              )}
            </Link>
            {user.role === 'ADMIN' && (
              <>
                <Link
                  href="/admin/activity"
                  title="Logs de actividad"
                  className="border border-gray-300 text-gray-600 p-2 rounded-lg hover:bg-gray-100"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                    <line x1="16" y1="13" x2="8" y2="13"/>
                    <line x1="16" y1="17" x2="8" y2="17"/>
                    <polyline points="10 9 9 9 8 9"/>
                  </svg>
                </Link>
                <Link
                  href="/admin/users"
                  className="text-sm border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-100"
                >
                  Usuarios
                </Link>
                <Link
                  href="/admin/countries/new"
                  className="text-sm bg-gray-900 text-white px-4 py-2 rounded-lg hover:bg-gray-700"
                >
                  + Nuevo país
                </Link>
              </>
            )}
          </div>
        </div>
```

- [ ] **Step 3: Verificar TypeScript**

```bash
cd C:/Users/34634/Projects/veconecta && npx tsc --noEmit
```

Expected: sin errores.

- [ ] **Step 4: Commit**

```bash
git add "app/admin/(dashboard)/page.tsx"
git commit -m "feat: add global urgent review button to admin home"
```

---

## Task 2: Página de revisión global

**Files:**
- Create: `app/admin/(dashboard)/review/page.tsx`

**Interfaces:**
- Consumes: nada de Task 1 (page.tsx ya existía, el botón solo enlaza a esta URL)
- Produce: página en `/admin/review` accesible para ADMIN y EDITOR

### Contexto

El archivo no existe. La nueva página es análoga a `app/admin/(dashboard)/[country]/review/page.tsx` pero:
- Sin parámetro de ruta `[country]` — la URL es `/admin/review`
- Query global filtrado por rol
- Muestra flag + nombre del país en cada card
- Sin toggle (solo urgentes)
- `confirm` recibe `countrySlug` como hidden input para revalidación y log

- [ ] **Step 1: Crear el archivo**

Crear `app/admin/(dashboard)/review/page.tsx` con el siguiente contenido completo:

```tsx
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/lucia'
import { revalidatePath } from 'next/cache'
import Link from 'next/link'
import { logAction } from '@/lib/audit'
import { flagUrl } from '@/lib/country-iso'

const CATEGORY_LABELS: Record<string, string> = {
  FIND_FAMILY: 'Encontrar familia',
  DONATE_MONEY: 'Donar dinero',
  SEND_MONEY: 'Enviar dinero',
  CALL_FREE: 'Llamada gratuita',
  DONATE_PHYSICALLY: 'Donación física',
  DIGITAL_BRIDGE: 'Puente digital',
  CONSULAR: 'Consular',
  MENTAL_HEALTH: 'Salud mental',
}

function Flag({ cca2, slug, flag, size = 20 }: { cca2: string | null; slug: string; flag: string; size?: number }) {
  const src = cca2 ? `https://flagcdn.com/w40/${cca2}.png` : flagUrl(slug)
  if (src) return <img src={src} width={size} height={Math.round(size * 0.67)} alt="" className="rounded-[2px] object-cover shrink-0" />
  return <span className="leading-none" style={{ fontSize: size }}>{flag}</span>
}

export default async function GlobalReviewPage({
  searchParams,
}: {
  searchParams: Promise<{ i?: string }>
}) {
  const { i: iParam } = await searchParams
  const { user } = await getSession()
  if (!user) redirect('/admin/login')

  const resources = await prisma.resource.findMany({
    where: {
      status: 'PUBLISHED',
      expiresAt: { lte: new Date(Date.now() + 2 * 86400000) },
      ...(user.role === 'EDITOR' ? { countrySlug: { in: user.countrySlugs } } : {}),
    },
    orderBy: [
      { expiresAt: 'asc' },
      { createdAt: 'asc' },
    ],
  })

  const total = resources.length
  const idx = Math.max(0, Math.min(parseInt(iParam ?? '0', 10) || 0, Math.max(total - 1, 0)))
  const resource = resources[idx]
  const prevI = idx > 0 ? idx - 1 : null
  const nextI = idx < total - 1 ? idx + 1 : null

  const countrySlugs = [...new Set(resources.map((r) => r.countrySlug))]
  const countryRows = await prisma.country.findMany({
    where: { slug: { in: countrySlugs } },
    select: { slug: true, nameEs: true, cca2: true, flag: true },
  })
  const countryMap = Object.fromEntries(countryRows.map((c) => [c.slug, c]))

  async function confirm(formData: FormData) {
    'use server'
    const id = formData.get('id') as string
    const returnI = formData.get('returnI') as string
    const countrySlug = formData.get('countrySlug') as string
    const { user } = await getSession()
    if (!user) return
    if (user.role === 'EDITOR' && !user.countrySlugs.includes(countrySlug)) return

    const updated = await prisma.resource.update({
      where: { id },
      data: {
        verifiedAt: new Date(),
        verifiedBy: user.email,
        expiresAt: new Date(Date.now() + 5 * 86400000),
      },
    })
    await logAction({
      userEmail: user.email,
      action: 'RESOURCE_CONFIRM',
      entityType: 'resource',
      entityId: id,
      entityName: updated.name,
      countrySlug,
    })
    revalidatePath('/admin/review')
    revalidatePath('/admin')
    revalidatePath(`/admin/${countrySlug}`)
    revalidatePath(`/admin/${countrySlug}/review`)
    revalidatePath(`/es/${countrySlug}`)
    revalidatePath(`/en/${countrySlug}`)
    revalidatePath(`/pt/${countrySlug}`)
    redirect(`/admin/review?i=${returnI}`)
  }

  if (total === 0) {
    return (
      <div className="max-w-2xl">
        <Breadcrumb />
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center space-y-3">
          <p className="text-gray-500 text-sm">
            ¡Sin urgentes! Todos los temporales tienen vigencia suficiente.
          </p>
          <div>
            <Link href="/admin" className="text-sm text-gray-400 hover:underline">
              ← Volver a inicio
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const currentCountry = countryMap[resource.countrySlug]

  return (
    <div className="max-w-2xl">
      <Breadcrumb />

      {/* Controls */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-gray-500 tabular-nums">{idx + 1} / {total}</span>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-gray-100 rounded-full mb-5">
        <div
          className="h-1 bg-caribe rounded-full transition-all"
          style={{ width: `${((idx + 1) / total) * 100}%` }}
        />
      </div>

      {/* Resource card */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        {/* Country */}
        {currentCountry && (
          <div className="flex items-center gap-2">
            <Flag cca2={currentCountry.cca2} slug={resource.countrySlug} flag={currentCountry.flag} size={20} />
            <Link
              href={`/admin/${resource.countrySlug}`}
              className="text-xs text-gray-500 hover:text-gray-700 hover:underline"
            >
              {currentCountry.nameEs}
            </Link>
          </div>
        )}

        {/* Top meta */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex gap-2 flex-wrap">
            <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded">
              {CATEGORY_LABELS[resource.category] ?? resource.category}
            </span>
            {resource.city && (
              <span className="text-xs text-gray-400 bg-gray-50 px-2 py-1 rounded border border-gray-100">
                {resource.city}
              </span>
            )}
            {resource.free && (
              <span className="text-xs text-green-700 bg-green-50 px-2 py-1 rounded border border-green-100">
                Gratuito
              </span>
            )}
          </div>
          {resource.verifiedAt ? (
            <span className="text-xs text-green-700 bg-green-50 border border-green-200 px-2 py-1 rounded shrink-0">
              ✓ {new Intl.DateTimeFormat('es-ES').format(resource.verifiedAt)}
            </span>
          ) : (
            <span className="text-xs text-orange-700 bg-orange-50 border border-orange-200 px-2 py-1 rounded shrink-0">
              Sin confirmar
            </span>
          )}
        </div>

        {/* Name */}
        <div>
          <p className="text-xl font-bold text-gray-900">{resource.name}</p>
          {resource.nameEn && (
            <p className="text-sm text-gray-400 mt-0.5">
              <span className="font-medium">EN</span> {resource.nameEn}
            </p>
          )}
          {resource.namePt && (
            <p className="text-sm text-gray-400 mt-0.5">
              <span className="font-medium">PT</span> {resource.namePt}
            </p>
          )}
        </div>

        {/* URL */}
        {resource.url && (
          <div className="bg-gray-50 rounded-lg p-3 flex items-center justify-between gap-3 border border-gray-200">
            <span className="text-xs text-gray-500 truncate min-w-0">
              {resource.url.replace(/^https?:\/\//, '')}
            </span>
            <a
              href={resource.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-white bg-caribe px-3 py-1.5 rounded hover:opacity-90 shrink-0 font-medium"
            >
              Abrir ↗
            </a>
          </div>
        )}

        {/* Contact / location */}
        {(resource.phone || resource.bizum || resource.address || resource.schedule) && (
          <div className="grid grid-cols-2 gap-3 text-sm">
            {resource.phone && (
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Teléfono / WhatsApp</p>
                <p className="text-gray-700">{resource.phone}</p>
              </div>
            )}
            {resource.bizum && (
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Bizum</p>
                <p className="text-gray-700">{resource.bizum}</p>
              </div>
            )}
            {resource.address && (
              <div className="col-span-2">
                <p className="text-xs text-gray-400 mb-0.5">Dirección</p>
                <p className="text-gray-700">{resource.address}</p>
              </div>
            )}
            {resource.schedule && (
              <div className="col-span-2">
                <p className="text-xs text-gray-400 mb-0.5">Horario</p>
                <p className="text-gray-700">{resource.schedule}</p>
              </div>
            )}
          </div>
        )}

        {/* Expiry */}
        {resource.expiresAt && (() => {
          const ms = resource.expiresAt!.getTime() - Date.now()
          const days = Math.ceil(ms / 86400000)
          return (
            <div className={`text-sm font-medium px-3 py-2 rounded-lg text-center ${
              ms < 0
                ? 'bg-red-50 text-red-700 border border-red-200'
                : days <= 2
                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                : 'bg-green-50 text-green-700 border border-green-200'
            }`}>
              {ms < 0
                ? `Vencido hace ${Math.abs(days)} día${Math.abs(days) !== 1 ? 's' : ''}`
                : days === 0
                ? 'Vence hoy'
                : `Vence en ${days} día${days !== 1 ? 's' : ''}`}
            </div>
          )
        })()}

        {/* Notes */}
        {resource.notesEs && (
          <div>
            <p className="text-xs text-gray-400 mb-1">Notas</p>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{resource.notesEs}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-2 border-t border-gray-100">
          {!resource.verifiedAt ? (
            <form action={confirm}>
              <input type="hidden" name="id" value={resource.id} />
              <input type="hidden" name="returnI" value={String(idx)} />
              <input type="hidden" name="countrySlug" value={resource.countrySlug} />
              <button
                type="submit"
                className="text-sm bg-green-700 text-white px-4 py-2 rounded-lg hover:bg-green-800 font-medium"
              >
                ✓ Confirmar info
              </button>
            </form>
          ) : (
            <form action={confirm}>
              <input type="hidden" name="id" value={resource.id} />
              <input type="hidden" name="returnI" value={String(idx)} />
              <input type="hidden" name="countrySlug" value={resource.countrySlug} />
              <button
                type="submit"
                className="text-sm border border-green-300 text-green-700 px-4 py-2 rounded-lg hover:bg-green-50 font-medium"
              >
                ↻ Reconfirmar
              </button>
            </form>
          )}
          <Link
            href={`/admin/${resource.countrySlug}/${resource.id}`}
            className="text-sm border border-gray-300 text-gray-600 px-4 py-2 rounded-lg hover:bg-gray-50"
          >
            Editar
          </Link>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-between items-center mt-4">
        {prevI !== null ? (
          <Link
            href={`/admin/review?i=${prevI}`}
            className="text-sm text-gray-600 hover:text-gray-900 px-3 py-2 border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            ← Anterior
          </Link>
        ) : (
          <div />
        )}
        {nextI !== null ? (
          <Link
            href={`/admin/review?i=${nextI}`}
            className="text-sm bg-gray-900 text-white px-4 py-2 rounded-lg hover:bg-gray-700"
          >
            Siguiente →
          </Link>
        ) : (
          <Link
            href="/admin"
            className="text-sm text-gray-500 hover:underline px-4 py-2"
          >
            Finalizar revisión ✓
          </Link>
        )}
      </div>
    </div>
  )
}

function Breadcrumb() {
  return (
    <nav className="flex items-center gap-2 mb-4 text-sm">
      <Link href="/admin" className="text-gray-400 hover:text-gray-700">
        Inicio
      </Link>
      <span className="text-gray-300">/</span>
      <span className="text-gray-900 font-medium">Revisión global</span>
    </nav>
  )
}
```

- [ ] **Step 2: Verificar TypeScript**

```bash
cd C:/Users/34634/Projects/veconecta && npx tsc --noEmit
```

Expected: sin errores.

- [ ] **Step 3: Verificar manualmente**

1. Abrir `http://localhost:3000/admin` — debe aparecer el botón "Revisar todo" con badge naranja si hay urgentes.
2. Hacer clic en "Revisar todo" → `/admin/review` — debe mostrar la primera card con flag + nombre del país.
3. Navegar con "Siguiente →" — debe avanzar por los recursos de todos los países.
4. Confirmar un recurso — debe renovar `expiresAt +5 días` y redirigir al siguiente.
5. Al confirmar el último urgente — debe ir al estado vacío "¡Sin urgentes!".
6. Si hay 0 urgentes desde el principio — el estado vacío aparece directamente.
7. Como EDITOR, solo aparecen recursos de los países asignados.

- [ ] **Step 4: Commit**

```bash
git add "app/admin/(dashboard)/review/page.tsx"
git commit -m "feat: add global urgent review page at /admin/review"
```

---

## Task 3: Push y deploy

- [ ] **Step 1: Push**

```bash
git push origin master
```

- [ ] **Step 2: Deploy a producción**

```bash
vercel --prod
```

- [ ] **Step 3: Verificar en producción**

Navegar a `veconecta.org/admin` y confirmar que el botón "Revisar todo" aparece y el flujo funciona end-to-end.
