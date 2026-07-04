import { notFound, redirect } from 'next/navigation'
import { Calendar } from 'lucide-react'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/lucia'
import { revalidatePath } from 'next/cache'
import Link from 'next/link'
import { flagUrl } from '@/lib/country-iso'
import { logAction, touchCountry } from '@/lib/audit'
import { FlagImage } from '@/components/admin/FlagImage'
import { LOCALES, formatEventRange } from '@/lib/locale-content'
import { reviewCutoff, REVIEW_CYCLE_DAYS } from '@/lib/review-config'
import { ConfirmButton } from '@/components/admin/ConfirmButton'

function Flag({ cca2, slug, flag, size = 32 }: { cca2: string | null; slug: string; flag: string; size?: number }) {
  const src = cca2 ? `https://flagcdn.com/w40/${cca2}.png` : flagUrl(slug)
  return <FlagImage src={src} flag={flag} size={size} />
}

type SessionUser = { email: string; role: 'ADMIN' | 'EDITOR'; countrySlugs: string[] }

function canManageCountry(user: SessionUser | null, targetCountry: string): user is SessionUser {
  if (!user) return false
  return user.role === 'ADMIN' || user.countrySlugs.includes(targetCountry)
}

async function resourceInCountry(id: string, targetCountry: string) {
  const existing = await prisma.resource.findUnique({ where: { id }, select: { countrySlug: true } })
  return existing?.countrySlug === targetCountry
}

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

function VerificationAge({ verifiedAt }: { verifiedAt: Date | null }) {
  if (!verifiedAt) return (
    <span className="text-xs font-medium px-1.5 py-0.5 rounded bg-orange-100 text-orange-700">
      Sin verificar
    </span>
  )
  const days = Math.floor((Date.now() - verifiedAt.getTime()) / 86400000)
  if (days === 0) return (
    <span className="text-xs font-medium px-1.5 py-0.5 rounded bg-green-100 text-green-700">
      Hoy
    </span>
  )
  if (days < REVIEW_CYCLE_DAYS - 2) return (
    <span className="text-xs font-medium px-1.5 py-0.5 rounded bg-green-100 text-green-700">
      {days}d
    </span>
  )
  if (days < REVIEW_CYCLE_DAYS) return (
    <span className="text-xs font-medium px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">
      {days}d
    </span>
  )
  return (
    <span className="text-xs font-medium px-1.5 py-0.5 rounded bg-red-100 text-red-700">
      {days}d
    </span>
  )
}

function EventChip({ eventStartsAt, eventEndsAt }: { eventStartsAt: Date | null; eventEndsAt: Date | null }) {
  const range = formatEventRange(
    eventStartsAt?.toISOString() ?? null,
    eventEndsAt?.toISOString() ?? null,
    'es',
  )
  if (!range) return null
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-medium text-caribe border border-caribe/30 bg-caribe/10 px-1.5 py-0.5 rounded">
      <Calendar size={10} strokeWidth={2.5} className="shrink-0" />
      {range}
    </span>
  )
}

export default async function AdminCountryPage({
  params,
}: {
  params: Promise<{ country: string }>
}) {
  const { country } = await params
  const { user } = await getSession()
  if (!user) redirect('/admin/login')

  // EDITOR can only access their assigned country
  if (user.role === 'EDITOR' && !user.countrySlugs.includes(country)) {
    redirect('/admin')
  }

  const countryRecord = await prisma.country.findUnique({
    where: { slug: country },
    include: {
      resources: {
        orderBy: [{ status: 'asc' }, { category: 'asc' }, { createdAt: 'asc' }],
        include: { city: true },
      },
    },
  })

  if (!countryRecord) notFound()

  const drafts = countryRecord.resources.filter((r) => r.status === 'DRAFT')
  const published = countryRecord.resources.filter((r) => r.status === 'PUBLISHED')
  const archived = countryRecord.resources.filter((r) => r.status === 'ARCHIVED')
  const cutoff = reviewCutoff()
  const urgentCount = published.filter(
    (r) => !r.verifiedAt || r.verifiedAt <= cutoff
  ).length

  async function publishResource(formData: FormData) {
    'use server'
    const id = formData.get('id') as string
    const { user } = await getSession()
    if (!canManageCountry(user, country)) return
    const now = new Date()
    if (!(await resourceInCountry(id, country))) return
    const resource = await prisma.resource.update({
      where: { id },
      data: {
        status: 'PUBLISHED',
        verifiedAt: user.role === 'ADMIN' ? now : null,
        verifiedBy: user.role === 'ADMIN' ? user.email : null,
      },
    })
    await logAction({ userEmail: user.email, action: 'RESOURCE_PUBLISH', entityType: 'resource', entityId: id, entityName: resource.name, countrySlug: country })
    await touchCountry(country)
    for (const l of LOCALES) revalidatePath(`/${l}/${country}`)
    for (const l of LOCALES) revalidatePath(`/${l}`)
    revalidatePath('/admin')
  }

  async function confirmResource(formData: FormData) {
    'use server'
    const id = formData.get('id') as string
    const { user } = await getSession()
    if (!user || user.role !== 'ADMIN') return
    const resource = await prisma.resource.update({
      where: { id },
      data: {
        verifiedAt: new Date(),
        verifiedBy: user.email,
      },
    })
    await logAction({ userEmail: user.email, action: 'RESOURCE_CONFIRM', entityType: 'resource', entityId: id, entityName: resource.name, countrySlug: country })
    await touchCountry(country)
    revalidatePath(`/admin/${country}`)
    revalidatePath('/admin')
    for (const l of LOCALES) revalidatePath(`/${l}/${country}`)
    for (const l of LOCALES) revalidatePath(`/${l}`)
  }

  async function duplicateResource(formData: FormData) {
    'use server'
    const id = formData.get('id') as string
    const { user } = await getSession()
    if (!canManageCountry(user, country)) return
    const src = await prisma.resource.findUnique({ where: { id } })
    if (!src || src.countrySlug !== country) return
    const { id: _id, createdAt: _c, updatedAt: _u, verifiedAt: _va, verifiedBy: _vb, status: _s, ...fields } = src
    const copy = await prisma.resource.create({
      data: { ...fields, status: 'DRAFT', verifiedAt: null, verifiedBy: null },
    })
    await logAction({ userEmail: user.email, action: 'RESOURCE_CREATE', entityType: 'resource', entityId: copy.id, entityName: copy.name, countrySlug: country })
    await touchCountry(country)
    revalidatePath(`/admin/${country}`)
  }

  async function archiveResource(formData: FormData) {
    'use server'
    const id = formData.get('id') as string
    const { user } = await getSession()
    if (!canManageCountry(user, country)) return
    if (!(await resourceInCountry(id, country))) return
    const resource = await prisma.resource.update({ where: { id }, data: { status: 'ARCHIVED' } })
    await logAction({ userEmail: user.email, action: 'RESOURCE_ARCHIVE', entityType: 'resource', entityId: id, entityName: resource.name, countrySlug: country })
    await touchCountry(country)
    for (const l of LOCALES) revalidatePath(`/${l}/${country}`)
    for (const l of LOCALES) revalidatePath(`/${l}`)
    revalidatePath('/admin')
  }

  async function restoreResource(formData: FormData) {
    'use server'
    const id = formData.get('id') as string
    const { user } = await getSession()
    if (!canManageCountry(user, country)) return
    if (!(await resourceInCountry(id, country))) return
    // Always restores to DRAFT (never straight to PUBLISHED): we don't track what the
    // resource's status was before archiving, so this forces a review rather than
    // risking a never-verified draft going live silently.
    const resource = await prisma.resource.update({ where: { id }, data: { status: 'DRAFT' } })
    await logAction({ userEmail: user.email, action: 'RESOURCE_RESTORE', entityType: 'resource', entityId: id, entityName: resource.name, countrySlug: country })
    await touchCountry(country)
    for (const l of LOCALES) revalidatePath(`/${l}/${country}`)
    for (const l of LOCALES) revalidatePath(`/${l}`)
    revalidatePath('/admin')
  }

  return (
    <div className="space-y-8">
      <div>
        <Link href="/admin" className="text-sm text-gray-500 hover:underline">
          ← Inicio
        </Link>
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Flag cca2={countryRecord.cca2} slug={countryRecord.slug} flag={countryRecord.flag} size={36} />
          <h1 className="text-xl font-bold text-gray-900">{countryRecord.nameEs}</h1>
        </div>
        <div className="flex gap-2">
          {published.length > 0 && (
            <Link
              href={`/admin/${country}/review`}
              className="text-sm border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 flex items-center gap-1.5"
            >
              Revisar
              {urgentCount > 0 && (
                <span className="text-xs bg-orange-500 text-white px-1.5 py-0.5 rounded-full leading-none">
                  {urgentCount}
                </span>
              )}
            </Link>
          )}
          <Link
            href={`/admin/${country}/new`}
            className="text-sm bg-gray-900 text-white px-4 py-2 rounded-lg hover:bg-gray-700"
          >
            + Añadir
          </Link>
        </div>
      </div>

      {drafts.length > 0 && (
        <section>
          <h2 className="text-base font-semibold text-amber-700 mb-3">
            Borradores ({drafts.length})
          </h2>
          <div className="space-y-2">
            {drafts.map((r) => (
              <div
                key={r.id}
                className="bg-white border border-amber-200 rounded-lg p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-medium text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                      {CATEGORY_LABELS[r.category] ?? r.category}
                    </span>
                    {r.city && <span className="text-xs text-gray-400">{r.city.nameEs}</span>}
                    <VerificationAge verifiedAt={r.verifiedAt} />
                  </div>
                  <div className="flex gap-2 shrink-0 flex-wrap justify-end">
                    <form action={duplicateResource}>
                      <input type="hidden" name="id" value={r.id} />
                      <button type="submit" className="text-lg leading-none border border-gray-300 text-gray-500 px-3 py-1.5 rounded hover:bg-gray-50" title="Duplicar">
                        ⎘
                      </button>
                    </form>
                    <Link
                      href={`/admin/${country}/${r.id}`}
                      className="text-xs border border-gray-300 text-gray-600 px-3 py-1.5 rounded hover:bg-gray-50"
                    >
                      Editar
                    </Link>
                    <form action={publishResource}>
                      <input type="hidden" name="id" value={r.id} />
                      <button type="submit" className="text-xs bg-green-700 text-white px-3 py-1.5 rounded hover:bg-green-800">
                        Publicar
                      </button>
                    </form>
                    <ConfirmButton
                      action={archiveResource}
                      hiddenFields={{ id: r.id }}
                      label="Archivar"
                      message={`¿Archivar "${r.name}"?`}
                      className="text-xs border border-red-200 text-red-600 px-3 py-1.5 rounded hover:bg-red-50"
                    />
                  </div>
                </div>
                <p className="font-medium text-sm text-gray-900 w-full mt-2">{r.name}</p>
                <div className="flex flex-wrap gap-x-3 mt-1">
                  {r.phone && <span className="text-xs text-gray-500">📞 {r.phone}</span>}
                  {r.url && (
                    <a href={r.url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 truncate max-w-[200px]">
                      {r.url.replace(/^https?:\/\//, '')}
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {published.length > 0 && (
      <section>
        <h2 className="text-base font-semibold text-green-700 mb-3">
          Publicados ({published.length})
        </h2>
        <div className="space-y-2">
          {published.map((r) => (
            <div
              key={r.id}
              className="bg-white border border-green-200 rounded-lg p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-medium text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                    {CATEGORY_LABELS[r.category] ?? r.category}
                  </span>
                  {r.city && <span className="text-xs text-gray-400">{r.city.nameEs}</span>}
                  <VerificationAge verifiedAt={r.verifiedAt} />
                  {r.kind === 'EVENT' && (
                    <EventChip eventStartsAt={r.eventStartsAt} eventEndsAt={r.eventEndsAt} />
                  )}
                  {r.validUntil && (
                    <span className="text-[10px] font-medium text-blue-700 border border-blue-200 bg-blue-50 px-1.5 py-0.5 rounded">
                      Hasta {new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short' }).format(r.validUntil)}
                    </span>
                  )}
                </div>
                <div className="flex gap-2 shrink-0 flex-wrap justify-end">
                  {user.role === 'ADMIN' && !r.verifiedAt && (
                    <form action={confirmResource}>
                      <input type="hidden" name="id" value={r.id} />
                      <button
                        type="submit"
                        className="text-xs bg-orange-500 text-white px-3 py-1.5 rounded hover:bg-orange-600"
                      >
                        Confirmar
                      </button>
                    </form>
                  )}
                  <form action={duplicateResource}>
                    <input type="hidden" name="id" value={r.id} />
                    <button type="submit" className="text-lg leading-none border border-gray-300 text-gray-500 px-3 py-1.5 rounded hover:bg-gray-50" title="Duplicar">
                      ⎘
                    </button>
                  </form>
                  <Link
                    href={`/admin/${country}/${r.id}`}
                    className="text-xs border border-gray-300 text-gray-600 px-3 py-1.5 rounded hover:bg-gray-50"
                  >
                    Editar
                  </Link>
                  <ConfirmButton
                    action={archiveResource}
                    hiddenFields={{ id: r.id }}
                    label="Archivar"
                    message={`¿Archivar "${r.name}"?`}
                    className="text-xs border border-red-200 text-red-600 px-3 py-1.5 rounded hover:bg-red-50"
                  />
                </div>
              </div>
              <p className="font-medium text-sm text-gray-900 w-full mt-2">{r.name}</p>
              <div className="flex flex-wrap gap-x-3 mt-1">
                {r.phone && <span className="text-xs text-gray-500">📞 {r.phone}</span>}
                {r.verifiedAt && (
                  <span className="text-xs text-gray-400">
                    Confirmado {new Intl.DateTimeFormat('es-ES').format(r.verifiedAt)}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>
      )}

      {archived.length > 0 && (
        <details className="group">
          <summary className="text-base font-semibold text-gray-500 mb-3 cursor-pointer select-none list-none flex items-center gap-2">
            <span className="inline-block transition-transform group-open:rotate-90">▸</span>
            Archivados ({archived.length})
          </summary>
          <div className="space-y-2 mt-3">
            {archived.map((r) => (
              <div
                key={r.id}
                className="bg-gray-50 border border-gray-200 rounded-lg p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-medium text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                      {CATEGORY_LABELS[r.category] ?? r.category}
                    </span>
                    {r.city && <span className="text-xs text-gray-400">{r.city.nameEs}</span>}
                  </div>
                  <div className="flex gap-2 shrink-0 flex-wrap justify-end">
                    <Link
                      href={`/admin/${country}/${r.id}`}
                      className="text-xs border border-gray-300 text-gray-600 px-3 py-1.5 rounded hover:bg-gray-50"
                    >
                      Editar
                    </Link>
                    <form action={restoreResource}>
                      <input type="hidden" name="id" value={r.id} />
                      <button
                        type="submit"
                        title="Vuelve a Borradores; no se publica automáticamente"
                        className="text-xs bg-gray-700 text-white px-3 py-1.5 rounded hover:bg-gray-800"
                      >
                        Restaurar a borrador
                      </button>
                    </form>
                  </div>
                </div>
                <p className="font-medium text-sm text-gray-600 w-full mt-2">{r.name}</p>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  )
}
