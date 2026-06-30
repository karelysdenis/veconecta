import { notFound, redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/lucia'
import { ResourceStatus } from '@prisma/client'
import { revalidatePath } from 'next/cache'
import Link from 'next/link'
import { flagUrl } from '@/lib/country-iso'
import { logAction } from '@/lib/audit'

function Flag({ cca2, slug, flag, size = 32 }: { cca2: string | null; slug: string; flag: string; size?: number }) {
  const src = cca2 ? `https://flagcdn.com/w40/${cca2}.png` : flagUrl(slug)
  if (src) return <img src={src} width={size} height={Math.round(size * 0.67)} alt="" className="rounded-[2px] object-cover shrink-0" />
  return <span className="leading-none" style={{ fontSize: size }}>{flag}</span>
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

function DaysLeft({ date }: { date: Date | null }) {
  if (!date) return null
  const ms = date.getTime() - Date.now()
  if (ms < 0) {
    return (
      <span className="text-xs font-medium px-1.5 py-0.5 rounded bg-red-100 text-red-700">
        Vencido
      </span>
    )
  }
  const days = Math.ceil(ms / 86400000)
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
        where: { status: { not: ResourceStatus.ARCHIVED } },
        orderBy: [{ status: 'asc' }, { category: 'asc' }, { createdAt: 'asc' }],
      },
    },
  })

  if (!countryRecord) notFound()

  const drafts = countryRecord.resources.filter((r) => r.status === 'DRAFT')
  const published = countryRecord.resources.filter((r) => r.status === 'PUBLISHED')
  const urgentCount = published.filter(
    (r) => r.expiresAt !== null && r.expiresAt <= new Date(Date.now() + 2 * 86400000)
  ).length

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

  async function confirmResource(formData: FormData) {
    'use server'
    const id = formData.get('id') as string
    const { user } = await getSession()
    if (!user || user.role !== 'ADMIN') return
    const existing = await prisma.resource.findUnique({ where: { id }, select: { expiresAt: true } })
    const resource = await prisma.resource.update({
      where: { id },
      data: {
        verifiedAt: new Date(),
        verifiedBy: user.email,
        ...(existing?.expiresAt != null ? { expiresAt: new Date(Date.now() + 5 * 86400000) } : {}),
      },
    })
    await logAction({ userEmail: user.email, action: 'RESOURCE_CONFIRM', entityType: 'resource', entityId: id, entityName: resource.name, countrySlug: country })
    revalidatePath(`/admin/${country}`)
    revalidatePath('/admin')
    revalidatePath(`/es/${country}`)
    revalidatePath(`/en/${country}`)
    revalidatePath(`/pt/${country}`)
  }

  async function archiveResource(formData: FormData) {
    'use server'
    const id = formData.get('id') as string
    const { user } = await getSession()
    if (!user) return
    if (user.role === 'EDITOR' && !user.countrySlugs.includes(country)) return
    const resource = await prisma.resource.update({ where: { id }, data: { status: 'ARCHIVED' } })
    await logAction({ userEmail: user.email, action: 'RESOURCE_ARCHIVE', entityType: 'resource', entityId: id, entityName: resource.name, countrySlug: country })
    revalidatePath(`/es/${country}`)
    revalidatePath(`/en/${country}`)
    revalidatePath(`/pt/${country}`)
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
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-xs font-medium text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                        {CATEGORY_LABELS[r.category] ?? r.category}
                      </span>
                      {r.city && <span className="text-xs text-gray-400">{r.city}</span>}
                      <DaysLeft date={r.expiresAt} />
                    </div>
                    <p className="font-medium text-sm text-gray-900">{r.name}</p>
                    <div className="flex flex-wrap gap-x-3 mt-1">
                      {r.phone && <span className="text-xs text-gray-500">📞 {r.phone}</span>}
                      {r.url && (
                        <a href={r.url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 truncate max-w-[200px]">
                          {r.url.replace(/^https?:\/\//, '')}
                        </a>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
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
                    <form action={archiveResource}>
                      <input type="hidden" name="id" value={r.id} />
                      <button type="submit" className="text-xs border border-red-200 text-red-600 px-3 py-1.5 rounded hover:bg-red-50">
                        Archivar
                      </button>
                    </form>
                  </div>
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
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-xs font-medium text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                      {CATEGORY_LABELS[r.category] ?? r.category}
                    </span>
                    {r.city && <span className="text-xs text-gray-400">{r.city}</span>}
                    <DaysLeft date={r.expiresAt} />
                    {!r.verifiedAt && (
                      <span className="text-[10px] font-medium text-orange-700 border border-orange-200 bg-orange-50 px-1.5 py-0.5 rounded">
                        Sin confirmar
                      </span>
                    )}
                  </div>
                  <p className="font-medium text-sm text-gray-900">{r.name}</p>
                  <div className="flex flex-wrap gap-x-3 mt-1">
                    {r.phone && <span className="text-xs text-gray-500">📞 {r.phone}</span>}
                    {r.verifiedAt && (
                      <span className="text-xs text-gray-400">
                        Confirmado {new Intl.DateTimeFormat('es-ES').format(r.verifiedAt)}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
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
                  <Link
                    href={`/admin/${country}/${r.id}`}
                    className="text-xs border border-gray-300 text-gray-600 px-3 py-1.5 rounded hover:bg-gray-50"
                  >
                    Editar
                  </Link>
                  <form action={archiveResource}>
                    <input type="hidden" name="id" value={r.id} />
                    <button
                      type="submit"
                      className="text-xs border border-red-200 text-red-600 px-3 py-1.5 rounded hover:bg-red-50"
                    >
                      Archivar
                    </button>
                  </form>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
      )}
    </div>
  )
}
