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
