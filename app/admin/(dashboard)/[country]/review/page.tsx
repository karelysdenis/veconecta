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
