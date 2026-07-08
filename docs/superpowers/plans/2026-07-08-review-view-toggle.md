# Toggle de vista en la cola de revisión (lista apilada / uno a uno) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a toggle to both review queues (`/admin/review` global and `/admin/[country]/review`) that switches between the existing "uno a uno" card view and a new "lista apilada" view showing every queued resource at once, with the choice remembered site-wide via a cookie.

**Architecture:** Extract the duplicated resource-review card markup (currently copy-pasted in both pages) into a shared `ResourceReviewCard` component plus a shared constants file, then add a cookie-backed view-mode helper (`lib/review-view.ts`) and a `ViewToggle` component. Both review pages read the view mode, branch their rendering (existing one-at-a-time flow vs. a new flat list), and skip the post-confirm/archive `redirect()` when in list mode so the page stays in place instead of jumping.

**Tech Stack:** Next.js 16 App Router (Server Components + Server Actions), TypeScript, Prisma, Tailwind v4, Vitest + @testing-library/react.

## Global Constraints

- Never use a red background for public-facing visual elements (not relevant to this admin-only feature, but keep in mind if touching shared UI).
- `tsc --noEmit` must stay clean and `vitest run` (full suite) must pass after every task.
- No new dependencies.
- Spanish UI copy, matching the existing tone in both review pages (e.g. "Confirmar info", "Archivar", "Sin confirmar").

---

### Task 1: Shared review-card constants

**Files:**
- Create: `components/admin/resource-review-constants.tsx`
- Test: `tests/components/resource-review-constants.test.ts`
- Modify (cleanup, done in Task 3/4, not here): none yet

**Interfaces:**
- Produces: `CATEGORY_LABELS: Record<string, string>`, `STATUS_LABELS: Record<string, string>`, `STATUS_STYLES: Record<string, string>`, `isToday(date: Date): boolean`, `Flag({ cca2, slug, flag, size }: { cca2: string | null; slug: string; flag: string; size?: number }): JSX.Element`: all currently duplicated verbatim in `app/admin/(dashboard)/[country]/review/page.tsx` and `app/admin/(dashboard)/review/page.tsx`.

- [ ] **Step 1: Write the failing test for `isToday`**

Create `tests/components/resource-review-constants.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { isToday } from '@/components/admin/resource-review-constants'

describe('isToday', () => {
  it('returns true for a date that falls on today (year/month/day)', () => {
    expect(isToday(new Date())).toBe(true)
  })

  it('returns false for a date from yesterday', () => {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    expect(isToday(yesterday)).toBe(false)
  })

  it('returns false for a date from a different year', () => {
    const lastYear = new Date()
    lastYear.setFullYear(lastYear.getFullYear() - 1)
    expect(isToday(lastYear)).toBe(false)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/components/resource-review-constants.test.ts`
Expected: FAIL: `Cannot find module '@/components/admin/resource-review-constants'`

- [ ] **Step 3: Create the constants file**

Create `components/admin/resource-review-constants.tsx`:

```tsx
import { flagUrl } from '@/lib/country-iso'
import { FlagImage } from '@/components/admin/FlagImage'

export const CATEGORY_LABELS: Record<string, string> = {
  FIND_FAMILY: 'Encontrar familia',
  DONATE_MONEY: 'Donar dinero',
  SEND_MONEY: 'Enviar dinero',
  CALL_FREE: 'Llamada gratuita',
  DONATE_PHYSICALLY: 'Donación física',
  DIGITAL_BRIDGE: 'Puente digital',
  CONSULAR: 'Consular',
  MENTAL_HEALTH: 'Salud mental',
}

export const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Borrador',
  PUBLISHED: 'Publicado',
  ARCHIVED: 'Archivado',
}

export const STATUS_STYLES: Record<string, string> = {
  DRAFT: 'text-amber-700 bg-amber-50 border-amber-200',
  PUBLISHED: 'text-blue-700 bg-blue-50 border-blue-200',
  ARCHIVED: 'text-gray-500 bg-gray-50 border-gray-200',
}

export function isToday(date: Date) {
  const now = new Date()
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  )
}

export function Flag({
  cca2,
  slug,
  flag,
  size = 20,
}: {
  cca2: string | null
  slug: string
  flag: string
  size?: number
}) {
  const src = cca2 ? `https://flagcdn.com/w40/${cca2}.png` : flagUrl(slug)
  return <FlagImage src={src} flag={flag} size={size} />
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/components/resource-review-constants.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Full verification and commit**

Run: `npx tsc --noEmit`: expect clean (no new errors; pre-existing DT-7 build-time issue with `RESEND_API_KEY` does not affect `tsc`).
Run: `npm test`: expect all existing tests still pass.

```bash
git add components/admin/resource-review-constants.tsx tests/components/resource-review-constants.test.ts
git commit -m "refactor: extract shared review-card labels/Flag into resource-review-constants"
```

---

### Task 2: Shared `ResourceReviewCard` component

**Files:**
- Create: `components/admin/ResourceReviewCard.tsx`
- Test: `tests/components/ResourceReviewCard.test.tsx`

**Interfaces:**
- Consumes: `CATEGORY_LABELS`, `STATUS_LABELS`, `STATUS_STYLES`, `isToday`, `Flag` from `@/components/admin/resource-review-constants` (Task 1); `ConfirmButton` from `@/components/admin/ConfirmButton`; `LinkStatusBadge` from `@/components/admin/LinkStatusBadge`; `LinkStatus` type from `@/lib/link-check`.
- Produces: `ResourceReviewCard(props): JSX.Element` with props `{ resource: ReviewResource; linkStatus: LinkStatus | 'none'; country?: { slug: string; nameEs: string; cca2: string | null; flag: string } | null; editHref: string; confirmAction: (fd: FormData) => void; archiveAction: (fd: FormData) => void; confirmHiddenFields: Record<string, string>; archiveHiddenFields: Record<string, string> }`. `ReviewResource` is also exported from this file for reuse by the two review pages.

- [ ] **Step 1: Write the failing test**

Create `tests/components/ResourceReviewCard.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ResourceReviewCard, type ReviewResource } from '@/components/admin/ResourceReviewCard'

const baseResource: ReviewResource = {
  id: 'r1',
  countrySlug: 'spain',
  category: 'DONATE_MONEY',
  status: 'PUBLISHED',
  name: 'Fundación X',
  nameEn: null,
  namePt: null,
  url: 'https://fundacionx.org',
  phone: null,
  paymentKey: null,
  address: null,
  schedule: null,
  validUntil: null,
  notesEs: null,
  free: false,
  verifiedAt: null,
  city: null,
}

function renderCard(overrides: Partial<Parameters<typeof ResourceReviewCard>[0]> = {}) {
  return render(
    <ResourceReviewCard
      resource={baseResource}
      linkStatus="ok"
      editHref="/admin/spain/r1"
      confirmAction={vi.fn()}
      archiveAction={vi.fn()}
      confirmHiddenFields={{ id: 'r1' }}
      archiveHiddenFields={{ id: 'r1' }}
      {...overrides}
    />,
  )
}

describe('ResourceReviewCard', () => {
  it('renders resource name, category label, and the confirm button when unverified', () => {
    renderCard()
    expect(screen.getByText('Fundación X')).toBeInTheDocument()
    expect(screen.getByText('Donar dinero')).toBeInTheDocument()
    expect(screen.getByText('Sin confirmar')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '✓ Confirmar info' })).toBeInTheDocument()
  })

  it('shows the reconfirm button and "confirmado" badge when verified today', () => {
    renderCard({ resource: { ...baseResource, verifiedAt: new Date() } })
    expect(screen.getByText('Recurso confirmado')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '↻ Reconfirmar' })).toBeInTheDocument()
  })

  it('hides the country block by default and shows it when the country prop is passed', () => {
    const { rerender } = renderCard()
    expect(screen.queryByText('España')).not.toBeInTheDocument()

    rerender(
      <ResourceReviewCard
        resource={baseResource}
        linkStatus="none"
        country={{ slug: 'spain', nameEs: 'España', cca2: 'es', flag: '🇪🇸' }}
        editHref="/admin/spain/r1"
        confirmAction={vi.fn()}
        archiveAction={vi.fn()}
        confirmHiddenFields={{ id: 'r1' }}
        archiveHiddenFields={{ id: 'r1' }}
      />,
    )
    expect(screen.getByText('España')).toBeInTheDocument()
  })

  it('hides the "Archivar" button once the resource is already archived', () => {
    renderCard({ resource: { ...baseResource, status: 'ARCHIVED' } })
    expect(screen.queryByRole('button', { name: 'Archivar' })).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/components/ResourceReviewCard.test.tsx`
Expected: FAIL: `Cannot find module '@/components/admin/ResourceReviewCard'`

- [ ] **Step 3: Create the component**

Create `components/admin/ResourceReviewCard.tsx`:

```tsx
import Link from 'next/link'
import { ConfirmButton } from '@/components/admin/ConfirmButton'
import { LinkStatusBadge } from '@/components/admin/LinkStatusBadge'
import type { LinkStatus } from '@/lib/link-check'
import { CATEGORY_LABELS, STATUS_LABELS, STATUS_STYLES, isToday, Flag } from '@/components/admin/resource-review-constants'

export type ReviewResource = {
  id: string
  countrySlug: string
  category: string
  status: string
  name: string
  nameEn: string | null
  namePt: string | null
  url: string | null
  phone: string | null
  paymentKey: string | null
  address: string | null
  schedule: string | null
  validUntil: Date | null
  notesEs: string | null
  free: boolean
  verifiedAt: Date | null
  city: { nameEs: string } | null
}

export function ResourceReviewCard({
  resource,
  linkStatus,
  country,
  editHref,
  confirmAction,
  archiveAction,
  confirmHiddenFields,
  archiveHiddenFields,
}: {
  resource: ReviewResource
  linkStatus: LinkStatus | 'none'
  country?: { slug: string; nameEs: string; cca2: string | null; flag: string } | null
  editHref: string
  confirmAction: (fd: FormData) => void
  archiveAction: (fd: FormData) => void
  confirmHiddenFields: Record<string, string>
  archiveHiddenFields: Record<string, string>
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
      {country && (
        <div className="flex items-center gap-2">
          <Flag cca2={country.cca2} slug={country.slug} flag={country.flag} size={20} />
          <Link
            href={`/admin/${country.slug}`}
            className="text-xs text-gray-500 hover:text-gray-700 hover:underline"
          >
            {country.nameEs}
          </Link>
        </div>
      )}

      {/* Top meta */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex gap-2 flex-wrap">
          <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded">
            {CATEGORY_LABELS[resource.category] ?? resource.category}
          </span>
          <span className={`text-xs px-2 py-1 rounded border ${STATUS_STYLES[resource.status]}`}>
            {STATUS_LABELS[resource.status] ?? resource.status}
          </span>
          {resource.city && (
            <span className="text-xs text-gray-400 bg-gray-50 px-2 py-1 rounded border border-gray-100">
              {resource.city.nameEs}
            </span>
          )}
          {resource.free && (
            <span className="text-xs text-green-700 bg-green-50 px-2 py-1 rounded border border-green-100">
              Gratuito
            </span>
          )}
        </div>
        {resource.verifiedAt ? (
          <span className="text-xs text-green-700 bg-green-50 border border-green-200 px-2 py-1 rounded shrink-0 text-right">
            <span className="block">✓ {new Intl.DateTimeFormat('es-ES').format(resource.verifiedAt)}</span>
            {isToday(resource.verifiedAt) && <span className="block font-medium">Recurso confirmado</span>}
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
          <div className="flex items-center gap-2 shrink-0">
            <LinkStatusBadge status={linkStatus} />
            <a
              href={resource.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-white bg-caribe px-3 py-1.5 rounded hover:opacity-90 font-medium"
            >
              Abrir ↗
            </a>
          </div>
        </div>
      )}

      {/* Contact / location */}
      {(resource.phone || resource.paymentKey || resource.address || resource.schedule) && (
        <div className="grid grid-cols-2 gap-3 text-sm">
          {resource.phone && (
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Teléfono / WhatsApp</p>
              <p className="text-gray-700">{resource.phone}</p>
            </div>
          )}
          {resource.paymentKey && (
            <div>
              <p className="text-xs text-gray-400 mb-0.5">
                {resource.countrySlug === 'spain' ? 'Bizum' : 'Clave de pago'}
              </p>
              <p className="text-gray-700">{resource.paymentKey}</p>
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

      {/* Fecha de fin editorial */}
      {resource.validUntil && (
        <div
          className={`text-sm font-medium px-3 py-2 rounded-lg text-center ${
            resource.validUntil < new Date()
              ? 'bg-red-50 text-red-700 border border-red-200'
              : 'bg-blue-50 text-blue-700 border border-blue-200'
          }`}
        >
          {resource.validUntil < new Date()
            ? `Venció el ${new Intl.DateTimeFormat('es-ES').format(resource.validUntil)}`
            : `Válido hasta ${new Intl.DateTimeFormat('es-ES').format(resource.validUntil)}`}
        </div>
      )}

      {/* Notes */}
      {resource.notesEs && (
        <div>
          <p className="text-xs text-gray-400 mb-1">Notas</p>
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{resource.notesEs}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 pt-2 border-t border-gray-100">
        {resource.status !== 'ARCHIVED' && (
          <ConfirmButton
            action={archiveAction}
            hiddenFields={archiveHiddenFields}
            label="Archivar"
            message={`¿Archivar "${resource.name}"?`}
            className="text-sm border border-red-200 text-red-600 px-4 py-2 rounded-lg hover:bg-red-50"
          />
        )}
        <div className="flex gap-3 ml-auto">
          <Link
            href={editHref}
            className="text-sm border border-gray-300 text-gray-600 px-4 py-2 rounded-lg hover:bg-gray-50"
          >
            Editar
          </Link>
          {!resource.verifiedAt ? (
            <form action={confirmAction}>
              {Object.entries(confirmHiddenFields).map(([k, v]) => (
                <input key={k} type="hidden" name={k} value={v} />
              ))}
              <button
                type="submit"
                className="text-sm bg-green-700 text-white px-4 py-2 rounded-lg hover:bg-green-800 font-medium"
              >
                ✓ Confirmar info
              </button>
            </form>
          ) : (
            <form action={confirmAction}>
              {Object.entries(confirmHiddenFields).map(([k, v]) => (
                <input key={k} type="hidden" name={k} value={v} />
              ))}
              <button
                type="submit"
                className="text-sm border border-green-300 text-green-700 px-4 py-2 rounded-lg hover:bg-green-50 font-medium"
              >
                ↻ Reconfirmar
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/components/ResourceReviewCard.test.tsx`
Expected: PASS (4 tests)

- [ ] **Step 5: Full verification and commit**

Run: `npx tsc --noEmit`: expect clean.
Run: `npm test`: expect all tests pass.

```bash
git add components/admin/ResourceReviewCard.tsx tests/components/ResourceReviewCard.test.tsx
git commit -m "feat: add shared ResourceReviewCard component"
```

---

### Task 3: Refactor the per-country review page to use the shared card (no behavior change)

**Files:**
- Modify: `app/admin/(dashboard)/[country]/review/page.tsx` (full rewrite of the render section; query/action logic unchanged)

**Interfaces:**
- Consumes: `ResourceReviewCard`, `ReviewResource` from Task 2.

- [ ] **Step 1: Replace the file contents**

Replace the entire contents of `app/admin/(dashboard)/[country]/review/page.tsx` with:

```tsx
import { notFound, redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/lucia'
import { revalidatePath } from 'next/cache'
import Link from 'next/link'
import { logAction, touchCountry } from '@/lib/audit'
import { LOCALES } from '@/lib/locale-content'
import { fetchResourcesByIds, annotateWithLinkStatus, sortForReview } from '@/lib/resource-review'
import { dueForReviewFilter } from '@/lib/review-config'
import { checkUrl } from '@/lib/link-check'
import { ResourceReviewCard } from '@/components/admin/ResourceReviewCard'

export default async function ReviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ country: string }>
  searchParams: Promise<{ i?: string; filter?: string; ids?: string; broken?: string }>
}) {
  const { country } = await params
  const { i: iParam, filter, ids: idsParam, broken: brokenParam } = await searchParams
  const { user } = await getSession()
  if (!user) redirect('/admin/login')
  if (user.role === 'EDITOR' && !user.countrySlugs.includes(country)) redirect('/admin')

  const showAll = filter === 'all'
  const brokenOnly = filter === 'broken'
  const filterQs = showAll ? '&filter=all' : brokenOnly ? '&filter=broken' : ''

  const countryRecord = await prisma.country.findUnique({ where: { slug: country } })
  if (!countryRecord) notFound()

  let resources: Awaited<ReturnType<typeof fetchResourcesByIds>>
  let brokenCount = parseInt(brokenParam ?? '0', 10)

  if (idsParam) {
    resources = await fetchResourcesByIds(idsParam.split(','), { countrySlug: country })
  } else {
    const dueResources = await prisma.resource.findMany({
      where: {
        countrySlug: country,
        status: 'PUBLISHED',
        ...(showAll || brokenOnly ? {} : dueForReviewFilter()),
      },
      orderBy: [
        { verifiedAt: { sort: 'asc', nulls: 'first' } },
        { createdAt: 'asc' },
      ],
      include: { city: true },
    })

    // Live link check runs once, here, for the whole batch — this is the only
    // place the "broken" count is computed, so it travels via the querystring
    // (like `ids=`) rather than being recomputed on every subsequent render.
    const annotated = sortForReview(await annotateWithLinkStatus(dueResources))
    brokenCount = annotated.filter((r) => r.linkStatus === 'broken').length
    resources = brokenOnly ? annotated.filter((r) => r.linkStatus === 'broken') : annotated

    // Snapshot the queue as a fixed list of IDs so confirming a resource doesn't
    // change the underlying filter result and reshuffle indices mid-review.
    if (resources.length > 0) {
      redirect(`/admin/${country}/review?ids=${resources.map((r) => r.id).join(',')}&i=0&broken=${brokenCount}${filterQs}`)
    }
  }

  const total = resources.length
  const pendingCount = resources.filter((r) => !r.verifiedAt).length

  const idx = Math.max(0, Math.min(parseInt(iParam ?? '0', 10) || 0, Math.max(total - 1, 0)))
  const resource = resources[idx]
  const prevI = idx > 0 ? idx - 1 : null
  const nextI = idx < total - 1 ? idx + 1 : null
  const idsQs = idsParam ? `&ids=${idsParam}&broken=${brokenCount}` : ''

  async function confirm(formData: FormData) {
    'use server'
    const id = formData.get('id') as string
    const returnI = formData.get('returnI') as string
    const returnFilter = formData.get('returnFilter') as string
    const returnIds = formData.get('returnIds') as string
    const returnBroken = formData.get('returnBroken') as string
    const { user } = await getSession()
    if (!user) return
    if (user.role === 'EDITOR' && !user.countrySlugs.includes(country)) return
    const row = await prisma.resource.findUnique({ where: { id }, select: { countrySlug: true } })
    if (!row || row.countrySlug !== country) return

    const updated = await prisma.resource.update({
      where: { id },
      data: {
        verifiedAt: new Date(),
        verifiedBy: user.email,
      },
    })
    await logAction({
      userEmail: user.email,
      action: 'RESOURCE_CONFIRM',
      entityType: 'resource',
      entityId: id,
      entityName: updated.name,
      countrySlug: country,
    })
    await touchCountry(country)
    revalidatePath(`/admin/${country}/review`)
    revalidatePath(`/admin/${country}`)
    for (const l of LOCALES) revalidatePath(`/${l}/${country}`)
    for (const l of LOCALES) revalidatePath(`/${l}`)

    const fqs = returnFilter === 'all' ? '&filter=all' : ''
    redirect(`/admin/${country}/review?i=${returnI}&ids=${returnIds}&broken=${returnBroken}${fqs}`)
  }

  async function archive(formData: FormData) {
    'use server'
    const id = formData.get('id') as string
    const returnI = formData.get('returnI') as string
    const returnFilter = formData.get('returnFilter') as string
    const returnIds = formData.get('returnIds') as string
    const returnBroken = formData.get('returnBroken') as string
    const { user } = await getSession()
    if (!user) return
    if (user.role === 'EDITOR' && !user.countrySlugs.includes(country)) return
    const row = await prisma.resource.findUnique({ where: { id }, select: { countrySlug: true } })
    if (!row || row.countrySlug !== country) return

    const updated = await prisma.resource.update({ where: { id }, data: { status: 'ARCHIVED' } })
    await logAction({
      userEmail: user.email,
      action: 'RESOURCE_ARCHIVE',
      entityType: 'resource',
      entityId: id,
      entityName: updated.name,
      countrySlug: country,
    })
    await touchCountry(country)
    revalidatePath(`/admin/${country}/review`)
    revalidatePath(`/admin/${country}`)
    revalidatePath('/admin')
    for (const l of LOCALES) revalidatePath(`/${l}/${country}`)
    for (const l of LOCALES) revalidatePath(`/${l}`)

    const fqs = returnFilter === 'all' ? '&filter=all' : ''
    redirect(`/admin/${country}/review?i=${returnI}&ids=${returnIds}&broken=${returnBroken}${fqs}`)
  }

  const afterConfirmI = nextI ?? idx

  if (total === 0) {
    return (
      <div className="max-w-2xl">
        <Breadcrumb country={country} nameEs={countryRecord.nameEs} />
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center space-y-3">
          <p className="text-gray-500 text-sm">
            {showAll || brokenOnly
              ? 'No hay recursos publicados en este país.'
              : '¡Al día! No hay recursos pendientes de revisión.'}
          </p>
          {!showAll && !brokenOnly && (
            <Link
              href={`/admin/${country}/review?filter=all`}
              className="inline-block text-sm text-blue-600 hover:underline"
            >
              Ver todos los recursos →
            </Link>
          )}
          <div>
            <Link href={`/admin/${country}`} className="text-sm text-gray-400 hover:underline">
              ← Volver a la lista
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const currentLinkStatus = resource.url ? await checkUrl(resource.url) : 'none'
  const hiddenFields = {
    id: resource.id,
    returnI: String(afterConfirmI),
    returnFilter: showAll ? 'all' : '',
    returnIds: idsParam ?? '',
    returnBroken: String(brokenCount),
  }

  return (
    <div className="max-w-2xl">
      <Breadcrumb country={country} nameEs={countryRecord.nameEs} />

      {/* Controls */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-gray-500 tabular-nums">{idx + 1} / {total}</span>
          {pendingCount > 0 ? (
            <span className="text-xs text-orange-700 bg-orange-50 border border-orange-200 px-2 py-0.5 rounded">
              {pendingCount} sin confirmar
            </span>
          ) : (
            <span className="text-xs text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded">
              Todos confirmados
            </span>
          )}
          {brokenCount > 0 && (
            <span className="text-xs text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded">
              {brokenCount} enlaces rotos
            </span>
          )}
        </div>
        <FilterToggle country={country} showAll={showAll} brokenOnly={brokenOnly} />
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-gray-100 rounded-full mb-5">
        <div
          className="h-1 bg-caribe rounded-full transition-all"
          style={{ width: `${((idx + 1) / total) * 100}%` }}
        />
      </div>

      <ResourceReviewCard
        resource={resource}
        linkStatus={currentLinkStatus}
        editHref={`/admin/${country}/${resource.id}?returnTo=${encodeURIComponent(`/admin/${country}/review?i=${idx}${filterQs}${idsQs}`)}`}
        confirmAction={confirm}
        archiveAction={archive}
        confirmHiddenFields={hiddenFields}
        archiveHiddenFields={hiddenFields}
      />

      {/* Navigation */}
      <div className="flex justify-between items-center mt-4">
        {prevI !== null ? (
          <Link
            href={`/admin/${country}/review?i=${prevI}${filterQs}${idsQs}`}
            className="text-sm text-gray-600 hover:text-gray-900 px-3 py-2 border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            ← Anterior
          </Link>
        ) : (
          <div />
        )}
        {nextI !== null ? (
          <Link
            href={`/admin/${country}/review?i=${nextI}${filterQs}${idsQs}`}
            className="text-sm bg-gray-900 text-white px-4 py-2 rounded-lg hover:bg-gray-700"
          >
            Siguiente →
          </Link>
        ) : (
          <Link
            href={`/admin/${country}`}
            className="text-sm text-gray-500 hover:underline px-4 py-2"
          >
            Finalizar revisión ✓
          </Link>
        )}
      </div>
    </div>
  )
}

function Breadcrumb({ country, nameEs }: { country: string; nameEs: string }) {
  return (
    <nav className="flex items-center gap-2 mb-4 text-sm">
      <Link href="/admin" className="text-gray-400 hover:text-gray-700">
        Inicio
      </Link>
      <span className="text-gray-300">/</span>
      <Link href={`/admin/${country}`} className="text-gray-400 hover:text-gray-700">
        {nameEs}
      </Link>
      <span className="text-gray-300">/</span>
      <span className="text-gray-900 font-medium">Revisión</span>
    </nav>
  )
}

function FilterToggle({
  country,
  showAll,
  brokenOnly,
}: {
  country: string
  showAll: boolean
  brokenOnly: boolean
}) {
  return (
    <div className="flex text-xs rounded-lg border border-gray-200 overflow-hidden">
      <Link
        href={`/admin/${country}/review?i=0`}
        className={`px-3 py-1.5 ${!showAll && !brokenOnly ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-gray-50'}`}
      >
        Urgentes
      </Link>
      <Link
        href={`/admin/${country}/review?i=0&filter=all`}
        className={`px-3 py-1.5 ${showAll ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-gray-50'}`}
      >
        Todos
      </Link>
      <Link
        href={`/admin/${country}/review?i=0&filter=broken`}
        className={`px-3 py-1.5 ${brokenOnly ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-gray-50'}`}
      >
        Rotos
      </Link>
    </div>
  )
}
```

- [ ] **Step 2: Verify no behavior change**

Run: `npx tsc --noEmit`: expect clean.
Run: `npm test`: expect all tests pass (no test targets this page directly; this step only guards against breaking imports elsewhere).

- [ ] **Step 3: Commit**

```bash
git add "app/admin/(dashboard)/[country]/review/page.tsx"
git commit -m "refactor: use shared ResourceReviewCard in per-country review page"
```

---

### Task 4: Refactor the global review page to use the shared card (no behavior change)

**Files:**
- Modify: `app/admin/(dashboard)/review/page.tsx` (full rewrite of the render section; query/action logic unchanged)

**Interfaces:**
- Consumes: `ResourceReviewCard`, `ReviewResource` from Task 2.

- [ ] **Step 1: Replace the file contents**

Replace the entire contents of `app/admin/(dashboard)/review/page.tsx` with:

```tsx
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/lucia'
import { revalidatePath } from 'next/cache'
import Link from 'next/link'
import { logAction, touchCountry } from '@/lib/audit'
import { LOCALES } from '@/lib/locale-content'
import { fetchResourcesByIds, annotateWithLinkStatus, sortForReview } from '@/lib/resource-review'
import { dueForReviewFilter } from '@/lib/review-config'
import { checkUrl } from '@/lib/link-check'
import { ResourceReviewCard } from '@/components/admin/ResourceReviewCard'

export default async function GlobalReviewPage({
  searchParams,
}: {
  searchParams: Promise<{ i?: string; ids?: string; broken?: string; filter?: string }>
}) {
  const { i: iParam, ids: idsParam, broken: brokenParam, filter } = await searchParams
  const { user } = await getSession()
  if (!user) redirect('/admin/login')

  const editorCountrySlugs = user.role === 'EDITOR' ? user.countrySlugs : null
  const showAll = filter === 'all'
  const brokenOnly = filter === 'broken'
  const filterQs = showAll ? '&filter=all' : brokenOnly ? '&filter=broken' : ''

  let resources: Awaited<ReturnType<typeof fetchResourcesByIds>>
  let brokenCount = parseInt(brokenParam ?? '0', 10)

  if (idsParam) {
    resources = await fetchResourcesByIds(
      idsParam.split(','),
      editorCountrySlugs ? { countrySlug: { in: editorCountrySlugs } } : {},
    )
  } else {
    const dueResources = await prisma.resource.findMany({
      where: {
        status: 'PUBLISHED',
        ...(showAll || brokenOnly ? {} : dueForReviewFilter()),
        ...(editorCountrySlugs ? { countrySlug: { in: editorCountrySlugs } } : {}),
      },
      orderBy: [
        { verifiedAt: { sort: 'asc', nulls: 'first' } },
        { createdAt: 'asc' },
      ],
      include: { city: true },
    })

    // Live link check runs once, here, for the whole batch — this is the only
    // place the "broken" count is computed, so it travels via the querystring
    // (like `ids=`) rather than being recomputed on every subsequent render.
    const annotated = sortForReview(await annotateWithLinkStatus(dueResources))
    brokenCount = annotated.filter((r) => r.linkStatus === 'broken').length
    resources = brokenOnly ? annotated.filter((r) => r.linkStatus === 'broken') : annotated

    // Snapshot the queue as a fixed list of IDs so confirming a resource (which
    // updates verifiedAt and would otherwise drop it out of the pending filter)
    // doesn't reshuffle indices mid-review. Confirmed items stay visible/navigable.
    if (resources.length > 0) {
      redirect(`/admin/review?ids=${resources.map((r) => r.id).join(',')}&i=0&broken=${brokenCount}${filterQs}`)
    }
  }

  const total = resources.length
  const pendingCount = resources.filter((r) => !r.verifiedAt).length
  const idx = Math.max(0, Math.min(parseInt(iParam ?? '0', 10) || 0, Math.max(total - 1, 0)))
  const resource = resources[idx]
  const prevI = idx > 0 ? idx - 1 : null
  const nextI = idx < total - 1 ? idx + 1 : null
  const afterConfirmI = nextI ?? idx
  const idsQs = idsParam ? `&ids=${idsParam}&broken=${brokenCount}` : ''

  async function confirm(formData: FormData) {
    'use server'
    const id = formData.get('id') as string
    const returnI = formData.get('returnI') as string
    const returnFilter = formData.get('returnFilter') as string
    const returnIds = formData.get('returnIds') as string
    const returnBroken = formData.get('returnBroken') as string
    const { user } = await getSession()
    if (!user) return
    const row = await prisma.resource.findUnique({ where: { id }, select: { countrySlug: true } })
    if (!row) return
    if (user.role === 'EDITOR' && !user.countrySlugs.includes(row.countrySlug)) return

    const updated = await prisma.resource.update({
      where: { id },
      data: {
        verifiedAt: new Date(),
        verifiedBy: user.email,
      },
    })
    await logAction({
      userEmail: user.email,
      action: 'RESOURCE_CONFIRM',
      entityType: 'resource',
      entityId: id,
      entityName: updated.name,
      countrySlug: row.countrySlug,
    })
    await touchCountry(row.countrySlug)
    revalidatePath('/admin/review')
    revalidatePath('/admin')
    revalidatePath(`/admin/${row.countrySlug}`)
    revalidatePath(`/admin/${row.countrySlug}/review`)
    for (const l of LOCALES) revalidatePath(`/${l}/${row.countrySlug}`)
    for (const l of LOCALES) revalidatePath(`/${l}`)

    const fqs = returnFilter === 'all' ? '&filter=all' : ''
    redirect(`/admin/review?i=${returnI}&ids=${returnIds}&broken=${returnBroken}${fqs}`)
  }

  async function archive(formData: FormData) {
    'use server'
    const id = formData.get('id') as string
    const returnI = formData.get('returnI') as string
    const returnFilter = formData.get('returnFilter') as string
    const returnIds = formData.get('returnIds') as string
    const returnBroken = formData.get('returnBroken') as string
    const { user } = await getSession()
    if (!user) return
    const row = await prisma.resource.findUnique({ where: { id }, select: { countrySlug: true } })
    if (!row) return
    if (user.role === 'EDITOR' && !user.countrySlugs.includes(row.countrySlug)) return

    const updated = await prisma.resource.update({ where: { id }, data: { status: 'ARCHIVED' } })
    await logAction({
      userEmail: user.email,
      action: 'RESOURCE_ARCHIVE',
      entityType: 'resource',
      entityId: id,
      entityName: updated.name,
      countrySlug: row.countrySlug,
    })
    await touchCountry(row.countrySlug)
    revalidatePath('/admin/review')
    revalidatePath('/admin')
    revalidatePath(`/admin/${row.countrySlug}`)
    revalidatePath(`/admin/${row.countrySlug}/review`)
    for (const l of LOCALES) revalidatePath(`/${l}/${row.countrySlug}`)
    for (const l of LOCALES) revalidatePath(`/${l}`)

    const fqs = returnFilter === 'all' ? '&filter=all' : ''
    redirect(`/admin/review?i=${returnI}&ids=${returnIds}&broken=${returnBroken}${fqs}`)
  }

  if (total === 0) {
    return (
      <div className="max-w-2xl">
        <Breadcrumb />
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center space-y-3">
          <p className="text-gray-500 text-sm">
            {showAll || brokenOnly
              ? 'No hay recursos publicados.'
              : '¡Al día! No hay recursos pendientes de revisión.'}
          </p>
          {!showAll && !brokenOnly && (
            <Link
              href="/admin/review?filter=all"
              className="inline-block text-sm text-blue-600 hover:underline"
            >
              Ver todos los recursos →
            </Link>
          )}
          <div>
            <Link href="/admin" className="text-sm text-gray-400 hover:underline">
              ← Volver a inicio
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const currentLinkStatus = resource.url ? await checkUrl(resource.url) : 'none'

  const countrySlugs = [...new Set(resources.map((r) => r.countrySlug))]
  const countryRows = await prisma.country.findMany({
    where: { slug: { in: countrySlugs } },
    select: { slug: true, nameEs: true, cca2: true, flag: true },
  })
  const countryMap = Object.fromEntries(countryRows.map((c) => [c.slug, c]))
  const currentCountry = countryMap[resource.countrySlug]

  const hiddenFields = {
    id: resource.id,
    returnI: String(afterConfirmI),
    returnFilter: showAll ? 'all' : '',
    returnIds: idsParam ?? '',
    returnBroken: String(brokenCount),
  }

  return (
    <div className="max-w-2xl">
      <Breadcrumb />

      {/* Controls */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-gray-500 tabular-nums">{idx + 1} / {total}</span>
          {pendingCount > 0 ? (
            <span className="text-xs text-orange-700 bg-orange-50 border border-orange-200 px-2 py-0.5 rounded">
              {pendingCount} sin confirmar
            </span>
          ) : (
            <span className="text-xs text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded">
              Todos confirmados
            </span>
          )}
          {brokenCount > 0 && (
            <span className="text-xs text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded">
              {brokenCount} enlaces rotos
            </span>
          )}
        </div>
        <FilterToggle showAll={showAll} brokenOnly={brokenOnly} />
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-gray-100 rounded-full mb-5">
        <div
          className="h-1 bg-caribe rounded-full transition-all"
          style={{ width: `${((idx + 1) / total) * 100}%` }}
        />
      </div>

      <ResourceReviewCard
        resource={resource}
        linkStatus={currentLinkStatus}
        country={currentCountry ?? null}
        editHref={`/admin/${resource.countrySlug}/${resource.id}?returnTo=${encodeURIComponent(`/admin/review?i=${idx}${filterQs}${idsQs}`)}`}
        confirmAction={confirm}
        archiveAction={archive}
        confirmHiddenFields={hiddenFields}
        archiveHiddenFields={hiddenFields}
      />

      {/* Navigation */}
      <div className="flex justify-between items-center mt-4">
        {prevI !== null ? (
          <Link
            href={`/admin/review?i=${prevI}${filterQs}${idsQs}`}
            className="text-sm text-gray-600 hover:text-gray-900 px-3 py-2 border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            ← Anterior
          </Link>
        ) : (
          <div />
        )}
        {nextI !== null ? (
          <Link
            href={`/admin/review?i=${nextI}${filterQs}${idsQs}`}
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

function FilterToggle({ showAll, brokenOnly }: { showAll: boolean; brokenOnly: boolean }) {
  return (
    <div className="flex text-xs rounded-lg border border-gray-200 overflow-hidden">
      <Link
        href="/admin/review?i=0"
        className={`px-3 py-1.5 ${!showAll && !brokenOnly ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-gray-50'}`}
      >
        Urgentes
      </Link>
      <Link
        href="/admin/review?i=0&filter=all"
        className={`px-3 py-1.5 ${showAll ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-gray-50'}`}
      >
        Todos
      </Link>
      <Link
        href="/admin/review?i=0&filter=broken"
        className={`px-3 py-1.5 ${brokenOnly ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-gray-50'}`}
      >
        Rotos
      </Link>
    </div>
  )
}
```

- [ ] **Step 2: Verify no behavior change**

Run: `npx tsc --noEmit`: expect clean.
Run: `npm test`: expect all tests pass.

- [ ] **Step 3: Commit**

```bash
git add "app/admin/(dashboard)/review/page.tsx"
git commit -m "refactor: use shared ResourceReviewCard in global review page"
```

---

### Task 5: `lib/review-view.ts`: cookie-backed view mode

**Files:**
- Create: `lib/review-view.ts`

**Interfaces:**
- Produces: `type ReviewViewMode = 'list' | 'one'`; `getReviewViewMode(): Promise<ReviewViewMode>`; `setReviewViewMode(formData: FormData): Promise<void>` (Server Action: reads `mode` and `returnTo` fields from the FormData, sets the `review_view` cookie, redirects to `returnTo`).

No automated test for this file: it wraps `next/headers`/`next/navigation` APIs that only work inside a real request context, the same reason `lib/lucia.ts` (which also wraps `cookies()`) has no unit test in this codebase. Verified manually in Task 9.

- [ ] **Step 1: Create the file**

Create `lib/review-view.ts`:

```ts
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

const COOKIE_NAME = 'review_view'
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365

export type ReviewViewMode = 'list' | 'one'

/** Reads the user's last-picked review queue view mode; defaults to 'one' (today's behavior). */
export async function getReviewViewMode(): Promise<ReviewViewMode> {
  const store = await cookies()
  return store.get(COOKIE_NAME)?.value === 'list' ? 'list' : 'one'
}

/** Server action: persists the chosen view mode site-wide and redirects back to the review queue. */
export async function setReviewViewMode(formData: FormData) {
  'use server'
  const mode: ReviewViewMode = formData.get('mode') === 'list' ? 'list' : 'one'
  const rawReturnTo = formData.get('returnTo')
  const returnTo =
    typeof rawReturnTo === 'string' && rawReturnTo.startsWith('/admin/') && !rawReturnTo.startsWith('//')
      ? rawReturnTo
      : '/admin'

  const store = await cookies()
  store.set(COOKIE_NAME, mode, { path: '/', maxAge: ONE_YEAR_SECONDS })
  redirect(returnTo)
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`: expect clean.

- [ ] **Step 3: Commit**

```bash
git add lib/review-view.ts
git commit -m "feat: add cookie-backed review view mode helper"
```

---

### Task 6: `ViewToggle` component

**Files:**
- Create: `components/admin/ViewToggle.tsx`
- Test: `tests/components/ViewToggle.test.tsx`

**Interfaces:**
- Consumes: `ReviewViewMode` type from `@/lib/review-view` (Task 5): type-only import, does not pull in `next/headers` at runtime.
- Produces: `ViewToggle({ mode, returnTo, action }: { mode: ReviewViewMode; returnTo: string; action: (fd: FormData) => void }): JSX.Element`. Takes the mutating action as a prop (rather than importing `setReviewViewMode` directly) so it stays a plain, easily-testable component: the two review pages pass `setReviewViewMode` in.

- [ ] **Step 1: Write the failing test**

Create `tests/components/ViewToggle.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ViewToggle } from '@/components/admin/ViewToggle'

describe('ViewToggle', () => {
  it('highlights "Uno a uno" when mode is "one"', () => {
    render(<ViewToggle mode="one" returnTo="/admin/review" action={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Uno a uno' })).toHaveClass('bg-gray-900')
    expect(screen.getByRole('button', { name: 'Lista' })).not.toHaveClass('bg-gray-900')
  })

  it('highlights "Lista" when mode is "list"', () => {
    render(<ViewToggle mode="list" returnTo="/admin/review" action={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Lista' })).toHaveClass('bg-gray-900')
    expect(screen.getByRole('button', { name: 'Uno a uno' })).not.toHaveClass('bg-gray-900')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/components/ViewToggle.test.tsx`
Expected: FAIL: `Cannot find module '@/components/admin/ViewToggle'`

- [ ] **Step 3: Create the component**

Create `components/admin/ViewToggle.tsx`:

```tsx
import type { ReviewViewMode } from '@/lib/review-view'

export function ViewToggle({
  mode,
  returnTo,
  action,
}: {
  mode: ReviewViewMode
  returnTo: string
  action: (fd: FormData) => void
}) {
  return (
    <div className="flex text-xs rounded-lg border border-gray-200 overflow-hidden">
      <form action={action}>
        <input type="hidden" name="mode" value="one" />
        <input type="hidden" name="returnTo" value={returnTo} />
        <button
          type="submit"
          className={`px-3 py-1.5 ${mode === 'one' ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-gray-50'}`}
        >
          Uno a uno
        </button>
      </form>
      <form action={action}>
        <input type="hidden" name="mode" value="list" />
        <input type="hidden" name="returnTo" value={returnTo} />
        <button
          type="submit"
          className={`px-3 py-1.5 ${mode === 'list' ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-gray-50'}`}
        >
          Lista
        </button>
      </form>
    </div>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/components/ViewToggle.test.tsx`
Expected: PASS (2 tests)

- [ ] **Step 5: Full verification and commit**

Run: `npx tsc --noEmit`: expect clean.
Run: `npm test`: expect all tests pass.

```bash
git add components/admin/ViewToggle.tsx tests/components/ViewToggle.test.tsx
git commit -m "feat: add ViewToggle component"
```

---

### Task 7: Wire list mode into the per-country review page

**Files:**
- Modify: `app/admin/(dashboard)/[country]/review/page.tsx` (full rewrite, building on Task 3's version)

**Interfaces:**
- Consumes: `getReviewViewMode`, `setReviewViewMode` from `@/lib/review-view` (Task 5); `ViewToggle` from `@/components/admin/ViewToggle` (Task 6); `annotateWithLinkStatus` from `@/lib/resource-review` (already imported).

- [ ] **Step 1: Replace the file contents**

Replace the entire contents of `app/admin/(dashboard)/[country]/review/page.tsx` with:

```tsx
import { notFound, redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/lucia'
import { revalidatePath } from 'next/cache'
import Link from 'next/link'
import { logAction, touchCountry } from '@/lib/audit'
import { LOCALES } from '@/lib/locale-content'
import { fetchResourcesByIds, annotateWithLinkStatus, sortForReview } from '@/lib/resource-review'
import { dueForReviewFilter } from '@/lib/review-config'
import { checkUrl } from '@/lib/link-check'
import { ResourceReviewCard } from '@/components/admin/ResourceReviewCard'
import { ViewToggle } from '@/components/admin/ViewToggle'
import { getReviewViewMode, setReviewViewMode } from '@/lib/review-view'

export default async function ReviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ country: string }>
  searchParams: Promise<{ i?: string; filter?: string; ids?: string; broken?: string }>
}) {
  const { country } = await params
  const { i: iParam, filter, ids: idsParam, broken: brokenParam } = await searchParams
  const { user } = await getSession()
  if (!user) redirect('/admin/login')
  if (user.role === 'EDITOR' && !user.countrySlugs.includes(country)) redirect('/admin')

  const viewMode = await getReviewViewMode()
  const showAll = filter === 'all'
  const brokenOnly = filter === 'broken'
  const filterQs = showAll ? '&filter=all' : brokenOnly ? '&filter=broken' : ''

  const countryRecord = await prisma.country.findUnique({ where: { slug: country } })
  if (!countryRecord) notFound()

  let resources: Awaited<ReturnType<typeof fetchResourcesByIds>>
  let brokenCount = parseInt(brokenParam ?? '0', 10)

  if (idsParam) {
    resources = await fetchResourcesByIds(idsParam.split(','), { countrySlug: country })
  } else {
    const dueResources = await prisma.resource.findMany({
      where: {
        countrySlug: country,
        status: 'PUBLISHED',
        ...(showAll || brokenOnly ? {} : dueForReviewFilter()),
      },
      orderBy: [
        { verifiedAt: { sort: 'asc', nulls: 'first' } },
        { createdAt: 'asc' },
      ],
      include: { city: true },
    })

    const annotated = sortForReview(await annotateWithLinkStatus(dueResources))
    brokenCount = annotated.filter((r) => r.linkStatus === 'broken').length
    resources = brokenOnly ? annotated.filter((r) => r.linkStatus === 'broken') : annotated

    if (resources.length > 0) {
      redirect(`/admin/${country}/review?ids=${resources.map((r) => r.id).join(',')}&i=0&broken=${brokenCount}${filterQs}`)
    }
  }

  const total = resources.length
  const pendingCount = resources.filter((r) => !r.verifiedAt).length

  const idx = Math.max(0, Math.min(parseInt(iParam ?? '0', 10) || 0, Math.max(total - 1, 0)))
  const resource = resources[idx]
  const prevI = idx > 0 ? idx - 1 : null
  const nextI = idx < total - 1 ? idx + 1 : null
  const idsQs = idsParam ? `&ids=${idsParam}&broken=${brokenCount}` : ''
  const returnTo = `/admin/${country}/review?i=${idx}${filterQs}${idsQs}`

  async function confirm(formData: FormData) {
    'use server'
    const id = formData.get('id') as string
    const { user } = await getSession()
    if (!user) return
    if (user.role === 'EDITOR' && !user.countrySlugs.includes(country)) return
    const row = await prisma.resource.findUnique({ where: { id }, select: { countrySlug: true } })
    if (!row || row.countrySlug !== country) return

    const updated = await prisma.resource.update({
      where: { id },
      data: {
        verifiedAt: new Date(),
        verifiedBy: user.email,
      },
    })
    await logAction({
      userEmail: user.email,
      action: 'RESOURCE_CONFIRM',
      entityType: 'resource',
      entityId: id,
      entityName: updated.name,
      countrySlug: country,
    })
    await touchCountry(country)
    revalidatePath(`/admin/${country}/review`)
    revalidatePath(`/admin/${country}`)
    for (const l of LOCALES) revalidatePath(`/${l}/${country}`)
    for (const l of LOCALES) revalidatePath(`/${l}`)

    // List mode never navigates: the mutation + revalidation above is enough,
    // the card re-renders in place with the ✓ badge, no redirect/scroll jump.
    if (viewMode === 'list') return

    const returnI = formData.get('returnI') as string
    const returnFilter = formData.get('returnFilter') as string
    const returnIds = formData.get('returnIds') as string
    const returnBroken = formData.get('returnBroken') as string
    const fqs = returnFilter === 'all' ? '&filter=all' : ''
    redirect(`/admin/${country}/review?i=${returnI}&ids=${returnIds}&broken=${returnBroken}${fqs}`)
  }

  async function archive(formData: FormData) {
    'use server'
    const id = formData.get('id') as string
    const { user } = await getSession()
    if (!user) return
    if (user.role === 'EDITOR' && !user.countrySlugs.includes(country)) return
    const row = await prisma.resource.findUnique({ where: { id }, select: { countrySlug: true } })
    if (!row || row.countrySlug !== country) return

    const updated = await prisma.resource.update({ where: { id }, data: { status: 'ARCHIVED' } })
    await logAction({
      userEmail: user.email,
      action: 'RESOURCE_ARCHIVE',
      entityType: 'resource',
      entityId: id,
      entityName: updated.name,
      countrySlug: country,
    })
    await touchCountry(country)
    revalidatePath(`/admin/${country}/review`)
    revalidatePath(`/admin/${country}`)
    revalidatePath('/admin')
    for (const l of LOCALES) revalidatePath(`/${l}/${country}`)
    for (const l of LOCALES) revalidatePath(`/${l}`)

    if (viewMode === 'list') return

    const returnI = formData.get('returnI') as string
    const returnFilter = formData.get('returnFilter') as string
    const returnIds = formData.get('returnIds') as string
    const returnBroken = formData.get('returnBroken') as string
    const fqs = returnFilter === 'all' ? '&filter=all' : ''
    redirect(`/admin/${country}/review?i=${returnI}&ids=${returnIds}&broken=${returnBroken}${fqs}`)
  }

  if (total === 0) {
    return (
      <div className="max-w-2xl">
        <Breadcrumb country={country} nameEs={countryRecord.nameEs} />
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center space-y-3">
          <p className="text-gray-500 text-sm">
            {showAll || brokenOnly
              ? 'No hay recursos publicados en este país.'
              : '¡Al día! No hay recursos pendientes de revisión.'}
          </p>
          {!showAll && !brokenOnly && (
            <Link
              href={`/admin/${country}/review?filter=all`}
              className="inline-block text-sm text-blue-600 hover:underline"
            >
              Ver todos los recursos →
            </Link>
          )}
          <div>
            <Link href={`/admin/${country}`} className="text-sm text-gray-400 hover:underline">
              ← Volver a la lista
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const oneAtATimeHiddenFields = {
    id: resource.id,
    returnI: String(nextI ?? idx),
    returnFilter: showAll ? 'all' : '',
    returnIds: idsParam ?? '',
    returnBroken: String(brokenCount),
  }

  const currentLinkStatus = viewMode === 'one' && resource.url ? await checkUrl(resource.url) : 'none'
  const listAnnotated = viewMode === 'list' ? await annotateWithLinkStatus(resources) : []

  return (
    <div className="max-w-2xl">
      <Breadcrumb country={country} nameEs={countryRecord.nameEs} />

      {/* Controls */}
      <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-gray-500 tabular-nums">
            {viewMode === 'one' ? `${idx + 1} / ${total}` : `${total} en total`}
          </span>
          {pendingCount > 0 ? (
            <span className="text-xs text-orange-700 bg-orange-50 border border-orange-200 px-2 py-0.5 rounded">
              {pendingCount} sin confirmar
            </span>
          ) : (
            <span className="text-xs text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded">
              Todos confirmados
            </span>
          )}
          {brokenCount > 0 && (
            <span className="text-xs text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded">
              {brokenCount} enlaces rotos
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <FilterToggle country={country} showAll={showAll} brokenOnly={brokenOnly} />
          <ViewToggle mode={viewMode} returnTo={returnTo} action={setReviewViewMode} />
        </div>
      </div>

      {viewMode === 'one' ? (
        <>
          {/* Progress bar */}
          <div className="h-1 bg-gray-100 rounded-full mb-5">
            <div
              className="h-1 bg-caribe rounded-full transition-all"
              style={{ width: `${((idx + 1) / total) * 100}%` }}
            />
          </div>

          <ResourceReviewCard
            resource={resource}
            linkStatus={currentLinkStatus}
            editHref={`/admin/${country}/${resource.id}?returnTo=${encodeURIComponent(returnTo)}`}
            confirmAction={confirm}
            archiveAction={archive}
            confirmHiddenFields={oneAtATimeHiddenFields}
            archiveHiddenFields={oneAtATimeHiddenFields}
          />

          {/* Navigation */}
          <div className="flex justify-between items-center mt-4">
            {prevI !== null ? (
              <Link
                href={`/admin/${country}/review?i=${prevI}${filterQs}${idsQs}`}
                className="text-sm text-gray-600 hover:text-gray-900 px-3 py-2 border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                ← Anterior
              </Link>
            ) : (
              <div />
            )}
            {nextI !== null ? (
              <Link
                href={`/admin/${country}/review?i=${nextI}${filterQs}${idsQs}`}
                className="text-sm bg-gray-900 text-white px-4 py-2 rounded-lg hover:bg-gray-700"
              >
                Siguiente →
              </Link>
            ) : (
              <Link
                href={`/admin/${country}`}
                className="text-sm text-gray-500 hover:underline px-4 py-2"
              >
                Finalizar revisión ✓
              </Link>
            )}
          </div>
        </>
      ) : (
        <div className="space-y-4">
          {listAnnotated.map((r) => (
            <ResourceReviewCard
              key={r.id}
              resource={r}
              linkStatus={r.linkStatus}
              editHref={`/admin/${country}/${r.id}?returnTo=${encodeURIComponent(returnTo)}`}
              confirmAction={confirm}
              archiveAction={archive}
              confirmHiddenFields={{ id: r.id }}
              archiveHiddenFields={{ id: r.id }}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function Breadcrumb({ country, nameEs }: { country: string; nameEs: string }) {
  return (
    <nav className="flex items-center gap-2 mb-4 text-sm">
      <Link href="/admin" className="text-gray-400 hover:text-gray-700">
        Inicio
      </Link>
      <span className="text-gray-300">/</span>
      <Link href={`/admin/${country}`} className="text-gray-400 hover:text-gray-700">
        {nameEs}
      </Link>
      <span className="text-gray-300">/</span>
      <span className="text-gray-900 font-medium">Revisión</span>
    </nav>
  )
}

function FilterToggle({
  country,
  showAll,
  brokenOnly,
}: {
  country: string
  showAll: boolean
  brokenOnly: boolean
}) {
  return (
    <div className="flex text-xs rounded-lg border border-gray-200 overflow-hidden">
      <Link
        href={`/admin/${country}/review?i=0`}
        className={`px-3 py-1.5 ${!showAll && !brokenOnly ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-gray-50'}`}
      >
        Urgentes
      </Link>
      <Link
        href={`/admin/${country}/review?i=0&filter=all`}
        className={`px-3 py-1.5 ${showAll ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-gray-50'}`}
      >
        Todos
      </Link>
      <Link
        href={`/admin/${country}/review?i=0&filter=broken`}
        className={`px-3 py-1.5 ${brokenOnly ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-gray-50'}`}
      >
        Rotos
      </Link>
    </div>
  )
}
```

- [ ] **Step 2: Verify it compiles and existing tests still pass**

Run: `npx tsc --noEmit`: expect clean.
Run: `npm test`: expect all tests pass.

- [ ] **Step 3: Commit**

```bash
git add "app/admin/(dashboard)/[country]/review/page.tsx"
git commit -m "feat: add list view mode to per-country review queue"
```

---

### Task 8: Wire list mode into the global review page

**Files:**
- Modify: `app/admin/(dashboard)/review/page.tsx` (full rewrite, building on Task 4's version)

**Interfaces:**
- Consumes: same as Task 7, applied to the global page. Additionally passes `country={currentCountry ?? null}` per list-mode card, resolved from the same `countryMap` the one-at-a-time view already builds: but in list mode, resources may span multiple countries, so the map must be built from the full `resources` list's `countrySlug`s regardless of view mode.

- [ ] **Step 1: Replace the file contents**

Replace the entire contents of `app/admin/(dashboard)/review/page.tsx` with:

```tsx
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/lucia'
import { revalidatePath } from 'next/cache'
import Link from 'next/link'
import { logAction, touchCountry } from '@/lib/audit'
import { LOCALES } from '@/lib/locale-content'
import { fetchResourcesByIds, annotateWithLinkStatus, sortForReview } from '@/lib/resource-review'
import { dueForReviewFilter } from '@/lib/review-config'
import { checkUrl } from '@/lib/link-check'
import { ResourceReviewCard } from '@/components/admin/ResourceReviewCard'
import { ViewToggle } from '@/components/admin/ViewToggle'
import { getReviewViewMode, setReviewViewMode } from '@/lib/review-view'

export default async function GlobalReviewPage({
  searchParams,
}: {
  searchParams: Promise<{ i?: string; ids?: string; broken?: string; filter?: string }>
}) {
  const { i: iParam, ids: idsParam, broken: brokenParam, filter } = await searchParams
  const { user } = await getSession()
  if (!user) redirect('/admin/login')

  const editorCountrySlugs = user.role === 'EDITOR' ? user.countrySlugs : null
  const viewMode = await getReviewViewMode()
  const showAll = filter === 'all'
  const brokenOnly = filter === 'broken'
  const filterQs = showAll ? '&filter=all' : brokenOnly ? '&filter=broken' : ''

  let resources: Awaited<ReturnType<typeof fetchResourcesByIds>>
  let brokenCount = parseInt(brokenParam ?? '0', 10)

  if (idsParam) {
    resources = await fetchResourcesByIds(
      idsParam.split(','),
      editorCountrySlugs ? { countrySlug: { in: editorCountrySlugs } } : {},
    )
  } else {
    const dueResources = await prisma.resource.findMany({
      where: {
        status: 'PUBLISHED',
        ...(showAll || brokenOnly ? {} : dueForReviewFilter()),
        ...(editorCountrySlugs ? { countrySlug: { in: editorCountrySlugs } } : {}),
      },
      orderBy: [
        { verifiedAt: { sort: 'asc', nulls: 'first' } },
        { createdAt: 'asc' },
      ],
      include: { city: true },
    })

    const annotated = sortForReview(await annotateWithLinkStatus(dueResources))
    brokenCount = annotated.filter((r) => r.linkStatus === 'broken').length
    resources = brokenOnly ? annotated.filter((r) => r.linkStatus === 'broken') : annotated

    if (resources.length > 0) {
      redirect(`/admin/review?ids=${resources.map((r) => r.id).join(',')}&i=0&broken=${brokenCount}${filterQs}`)
    }
  }

  const total = resources.length
  const pendingCount = resources.filter((r) => !r.verifiedAt).length
  const idx = Math.max(0, Math.min(parseInt(iParam ?? '0', 10) || 0, Math.max(total - 1, 0)))
  const resource = resources[idx]
  const prevI = idx > 0 ? idx - 1 : null
  const nextI = idx < total - 1 ? idx + 1 : null
  const idsQs = idsParam ? `&ids=${idsParam}&broken=${brokenCount}` : ''
  const returnTo = `/admin/review?i=${idx}${filterQs}${idsQs}`

  async function confirm(formData: FormData) {
    'use server'
    const id = formData.get('id') as string
    const { user } = await getSession()
    if (!user) return
    const row = await prisma.resource.findUnique({ where: { id }, select: { countrySlug: true } })
    if (!row) return
    if (user.role === 'EDITOR' && !user.countrySlugs.includes(row.countrySlug)) return

    const updated = await prisma.resource.update({
      where: { id },
      data: {
        verifiedAt: new Date(),
        verifiedBy: user.email,
      },
    })
    await logAction({
      userEmail: user.email,
      action: 'RESOURCE_CONFIRM',
      entityType: 'resource',
      entityId: id,
      entityName: updated.name,
      countrySlug: row.countrySlug,
    })
    await touchCountry(row.countrySlug)
    revalidatePath('/admin/review')
    revalidatePath('/admin')
    revalidatePath(`/admin/${row.countrySlug}`)
    revalidatePath(`/admin/${row.countrySlug}/review`)
    for (const l of LOCALES) revalidatePath(`/${l}/${row.countrySlug}`)
    for (const l of LOCALES) revalidatePath(`/${l}`)

    if (viewMode === 'list') return

    const returnI = formData.get('returnI') as string
    const returnFilter = formData.get('returnFilter') as string
    const returnIds = formData.get('returnIds') as string
    const returnBroken = formData.get('returnBroken') as string
    const fqs = returnFilter === 'all' ? '&filter=all' : ''
    redirect(`/admin/review?i=${returnI}&ids=${returnIds}&broken=${returnBroken}${fqs}`)
  }

  async function archive(formData: FormData) {
    'use server'
    const id = formData.get('id') as string
    const { user } = await getSession()
    if (!user) return
    const row = await prisma.resource.findUnique({ where: { id }, select: { countrySlug: true } })
    if (!row) return
    if (user.role === 'EDITOR' && !user.countrySlugs.includes(row.countrySlug)) return

    const updated = await prisma.resource.update({ where: { id }, data: { status: 'ARCHIVED' } })
    await logAction({
      userEmail: user.email,
      action: 'RESOURCE_ARCHIVE',
      entityType: 'resource',
      entityId: id,
      entityName: updated.name,
      countrySlug: row.countrySlug,
    })
    await touchCountry(row.countrySlug)
    revalidatePath('/admin/review')
    revalidatePath('/admin')
    revalidatePath(`/admin/${row.countrySlug}`)
    revalidatePath(`/admin/${row.countrySlug}/review`)
    for (const l of LOCALES) revalidatePath(`/${l}/${row.countrySlug}`)
    for (const l of LOCALES) revalidatePath(`/${l}`)

    if (viewMode === 'list') return

    const returnI = formData.get('returnI') as string
    const returnFilter = formData.get('returnFilter') as string
    const returnIds = formData.get('returnIds') as string
    const returnBroken = formData.get('returnBroken') as string
    const fqs = returnFilter === 'all' ? '&filter=all' : ''
    redirect(`/admin/review?i=${returnI}&ids=${returnIds}&broken=${returnBroken}${fqs}`)
  }

  if (total === 0) {
    return (
      <div className="max-w-2xl">
        <Breadcrumb />
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center space-y-3">
          <p className="text-gray-500 text-sm">
            {showAll || brokenOnly
              ? 'No hay recursos publicados.'
              : '¡Al día! No hay recursos pendientes de revisión.'}
          </p>
          {!showAll && !brokenOnly && (
            <Link
              href="/admin/review?filter=all"
              className="inline-block text-sm text-blue-600 hover:underline"
            >
              Ver todos los recursos →
            </Link>
          )}
          <div>
            <Link href="/admin" className="text-sm text-gray-400 hover:underline">
              ← Volver a inicio
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const countrySlugs = [...new Set(resources.map((r) => r.countrySlug))]
  const countryRows = await prisma.country.findMany({
    where: { slug: { in: countrySlugs } },
    select: { slug: true, nameEs: true, cca2: true, flag: true },
  })
  const countryMap = Object.fromEntries(countryRows.map((c) => [c.slug, c]))
  const currentCountry = countryMap[resource.countrySlug]

  const oneAtATimeHiddenFields = {
    id: resource.id,
    returnI: String(nextI ?? idx),
    returnFilter: showAll ? 'all' : '',
    returnIds: idsParam ?? '',
    returnBroken: String(brokenCount),
  }

  const currentLinkStatus = viewMode === 'one' && resource.url ? await checkUrl(resource.url) : 'none'
  const listAnnotated = viewMode === 'list' ? await annotateWithLinkStatus(resources) : []

  return (
    <div className="max-w-2xl">
      <Breadcrumb />

      {/* Controls */}
      <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-gray-500 tabular-nums">
            {viewMode === 'one' ? `${idx + 1} / ${total}` : `${total} en total`}
          </span>
          {pendingCount > 0 ? (
            <span className="text-xs text-orange-700 bg-orange-50 border border-orange-200 px-2 py-0.5 rounded">
              {pendingCount} sin confirmar
            </span>
          ) : (
            <span className="text-xs text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded">
              Todos confirmados
            </span>
          )}
          {brokenCount > 0 && (
            <span className="text-xs text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded">
              {brokenCount} enlaces rotos
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <FilterToggle showAll={showAll} brokenOnly={brokenOnly} />
          <ViewToggle mode={viewMode} returnTo={returnTo} action={setReviewViewMode} />
        </div>
      </div>

      {viewMode === 'one' ? (
        <>
          {/* Progress bar */}
          <div className="h-1 bg-gray-100 rounded-full mb-5">
            <div
              className="h-1 bg-caribe rounded-full transition-all"
              style={{ width: `${((idx + 1) / total) * 100}%` }}
            />
          </div>

          <ResourceReviewCard
            resource={resource}
            linkStatus={currentLinkStatus}
            country={currentCountry ?? null}
            editHref={`/admin/${resource.countrySlug}/${resource.id}?returnTo=${encodeURIComponent(returnTo)}`}
            confirmAction={confirm}
            archiveAction={archive}
            confirmHiddenFields={oneAtATimeHiddenFields}
            archiveHiddenFields={oneAtATimeHiddenFields}
          />

          {/* Navigation */}
          <div className="flex justify-between items-center mt-4">
            {prevI !== null ? (
              <Link
                href={`/admin/review?i=${prevI}${filterQs}${idsQs}`}
                className="text-sm text-gray-600 hover:text-gray-900 px-3 py-2 border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                ← Anterior
              </Link>
            ) : (
              <div />
            )}
            {nextI !== null ? (
              <Link
                href={`/admin/review?i=${nextI}${filterQs}${idsQs}`}
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
        </>
      ) : (
        <div className="space-y-4">
          {listAnnotated.map((r) => (
            <ResourceReviewCard
              key={r.id}
              resource={r}
              linkStatus={r.linkStatus}
              country={countryMap[r.countrySlug] ?? null}
              editHref={`/admin/${r.countrySlug}/${r.id}?returnTo=${encodeURIComponent(returnTo)}`}
              confirmAction={confirm}
              archiveAction={archive}
              confirmHiddenFields={{ id: r.id }}
              archiveHiddenFields={{ id: r.id }}
            />
          ))}
        </div>
      )}
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

function FilterToggle({ showAll, brokenOnly }: { showAll: boolean; brokenOnly: boolean }) {
  return (
    <div className="flex text-xs rounded-lg border border-gray-200 overflow-hidden">
      <Link
        href="/admin/review?i=0"
        className={`px-3 py-1.5 ${!showAll && !brokenOnly ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-gray-50'}`}
      >
        Urgentes
      </Link>
      <Link
        href="/admin/review?i=0&filter=all"
        className={`px-3 py-1.5 ${showAll ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-gray-50'}`}
      >
        Todos
      </Link>
      <Link
        href="/admin/review?i=0&filter=broken"
        className={`px-3 py-1.5 ${brokenOnly ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-gray-50'}`}
      >
        Rotos
      </Link>
    </div>
  )
}
```

- [ ] **Step 2: Verify it compiles and existing tests still pass**

Run: `npx tsc --noEmit`: expect clean.
Run: `npm test`: expect all tests pass.

- [ ] **Step 3: Commit**

```bash
git add "app/admin/(dashboard)/review/page.tsx"
git commit -m "feat: add list view mode to global review queue"
```

---

### Task 9: End-to-end verification and memory update

**Files:** none (manual verification + memory update only)

- [ ] **Step 1: Start the dev server**

Run: `npm run dev` (background). Confirm it boots without errors on `http://localhost:3000`.

- [ ] **Step 2: Log in as admin**

Trigger a magic-link login for `karelys@reakagency.com` at `/admin/login`, capture the link from the dev server console log (`🔑 MAGIC LINK (dev)`), and visit it to establish a real session: same approach used in prior sessions for this project (see project memory).

- [ ] **Step 3: Verify the per-country review queue**

At `/admin/spain/review` (or another seeded country):
- Confirm the default view on first visit (no cookie yet) is "Uno a uno", matching current behavior.
- Click the "Lista" toggle button. Confirm the page re-renders as a flat stacked list of all queued resources, each with its own Confirmar/Archivar/Editar controls, link-status badge, no progress bar, no Anterior/Siguiente.
- Confirm one resource from the middle of the list. Confirm the page does **not** navigate/redirect: it stays on the list, the confirmed card updates to show the ✓ badge, and scroll position is not reset to the top.
- Archive a resource from the list. Confirm it stays visible with the "Archivado" badge and the "Archivar" button disappears from that card.
- Switch back to "Uno a uno". Confirm the original card-by-card flow with Anterior/Siguiente still works exactly as before.
- Try the "Todos" and "Rotos" filters in both view modes; confirm the resource set shown matches the filter in both.

- [ ] **Step 4: Verify the global review queue**

At `/admin/review`:
- Repeat the same checks as Step 3.
- Confirm each card in list mode shows the correct country flag + name (the global page's list cards should show country context; the per-country page's cards should not).

- [ ] **Step 5: Verify cookie persistence across pages**

While viewing `/admin/spain/review`, switch to "Lista". Navigate to `/admin/review` (global) and to `/admin/mexico/review` (or another country). Confirm both open directly in "Lista" mode without needing to toggle again. Switch back to "Uno a uno" on any of them and confirm the other pages also revert.

- [ ] **Step 6: Run the full verification suite one more time**

Run: `npx tsc --noEmit`: expect clean.
Run: `npm test`: expect all tests pass.

- [ ] **Step 7: Update project memory**

Update `project-veconecta.md` in the memory directory with a new dated section summarizing: the list/one-at-a-time toggle, the cookie mechanism, the `ResourceReviewCard`/`resource-review-constants` extraction (and that it resolves DT-5), and the confirm/archive no-redirect behavior in list mode. Remove DT-5 from the "Deuda técnica pendiente" list since it's now resolved.

---

## Self-Review Notes

- **Spec coverage:** Section "Alcance" → Tasks 7/8 (both pages). "Arquitectura" → Tasks 1/2/5/6. "Comportamiento de la lista" (no index, confirm/archive without redirect, archived resources stay visible, Editar `returnTo`) → Tasks 7/8. "Chequeo de enlaces en modo lista" (re-check every reload) → Tasks 7/8 via `annotateWithLinkStatus(resources)` called on every list-mode render. "Persistencia del toggle" (cookie, site-wide, default `one`) → Task 5. "Fuera de alcance" items are not implemented anywhere in this plan, as intended.
- **Placeholder scan:** none found. Eevery step has literal file contents or exact commands.
- **Type consistency:** `ReviewResource`/`ResourceReviewCard` props (Task 2) are used identically in Tasks 3/4/7/8; `ReviewViewMode`/`getReviewViewMode`/`setReviewViewMode` (Task 5) match their usage in Tasks 6/7/8; `ViewToggle`'s `action` prop signature `(fd: FormData) => void` matches `setReviewViewMode`'s signature.
