import { notFound, redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/lucia'
import { revalidatePath } from 'next/cache'
import Link from 'next/link'
import { logAction } from '@/lib/audit'

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

export default async function ReviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ country: string }>
  searchParams: Promise<{ i?: string; filter?: string }>
}) {
  const { country } = await params
  const { i: iParam, filter } = await searchParams
  const { user } = await getSession()
  if (!user) redirect('/admin/login')
  if (user.role === 'EDITOR' && !user.countrySlugs.includes(country)) redirect('/admin')

  const showAll = filter === 'all'

  const countryRecord = await prisma.country.findUnique({ where: { slug: country } })
  if (!countryRecord) notFound()

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

  const total = resources.length
  const urgentCount = showAll
    ? resources.filter((r) => r.expiresAt! <= new Date(Date.now() + 2 * 86400000)).length
    : total

  const idx = Math.max(0, Math.min(parseInt(iParam ?? '0', 10) || 0, Math.max(total - 1, 0)))
  const resource = resources[idx]
  const prevI = idx > 0 ? idx - 1 : null
  const nextI = idx < total - 1 ? idx + 1 : null
  const filterQs = showAll ? '&filter=all' : ''

  async function confirm(formData: FormData) {
    'use server'
    const id = formData.get('id') as string
    const returnI = formData.get('returnI') as string
    const returnFilter = formData.get('returnFilter') as string
    const { user } = await getSession()
    if (!user) return
    if (user.role === 'EDITOR' && !user.countrySlugs.includes(country)) return

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
      countrySlug: country,
    })
    revalidatePath(`/admin/${country}/review`)
    revalidatePath(`/admin/${country}`)
    revalidatePath(`/es/${country}`)
    revalidatePath(`/en/${country}`)
    revalidatePath(`/pt/${country}`)

    const fqs = returnFilter === 'all' ? '&filter=all' : ''
    redirect(`/admin/${country}/review?i=${returnI}${fqs}`)
  }

  const afterConfirmI = showAll ? (nextI ?? idx) : idx

  if (total === 0) {
    return (
      <div className="max-w-2xl">
        <Breadcrumb country={country} nameEs={countryRecord.nameEs} />
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center space-y-3">
          <p className="text-gray-500 text-sm">
            {showAll
              ? 'No hay recursos temporales en este país.'
              : '¡Sin urgentes! Todos los temporales tienen vigencia suficiente.'}
          </p>
          {!showAll && (
            <Link
              href={`/admin/${country}/review?filter=all`}
              className="inline-block text-sm text-blue-600 hover:underline"
            >
              Ver todos los temporales →
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

  return (
    <div className="max-w-2xl">
      <Breadcrumb country={country} nameEs={countryRecord.nameEs} />

      {/* Controls */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500 tabular-nums">{idx + 1} / {total}</span>
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
        </div>
        <FilterToggle country={country} showAll={showAll} idx={idx} />
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
              <input type="hidden" name="returnI" value={String(afterConfirmI)} />
              <input type="hidden" name="returnFilter" value={showAll ? 'all' : ''} />
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
              <input type="hidden" name="returnI" value={String(afterConfirmI)} />
              <input type="hidden" name="returnFilter" value={showAll ? 'all' : ''} />
              <button
                type="submit"
                className="text-sm border border-green-300 text-green-700 px-4 py-2 rounded-lg hover:bg-green-50 font-medium"
              >
                ↻ Reconfirmar
              </button>
            </form>
          )}
          <Link
            href={`/admin/${country}/${resource.id}`}
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
            href={`/admin/${country}/review?i=${prevI}${filterQs}`}
            className="text-sm text-gray-600 hover:text-gray-900 px-3 py-2 border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            ← Anterior
          </Link>
        ) : (
          <div />
        )}
        {nextI !== null ? (
          <Link
            href={`/admin/${country}/review?i=${nextI}${filterQs}`}
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
