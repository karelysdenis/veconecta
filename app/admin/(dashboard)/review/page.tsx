import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/lucia'
import { revalidatePath } from 'next/cache'
import Link from 'next/link'
import { logAction } from '@/lib/audit'
import { flagUrl } from '@/lib/country-iso'
import { FlagImage } from '@/components/admin/FlagImage'

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
  return <FlagImage src={src} flag={flag} size={size} />
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
    include: { city: true },
  })

  const total = resources.length
  const idx = Math.max(0, Math.min(parseInt(iParam ?? '0', 10) || 0, Math.max(total - 1, 0)))
  const resource = resources[idx]
  const prevI = idx > 0 ? idx - 1 : null
  const nextI = idx < total - 1 ? idx + 1 : null

  async function confirm(formData: FormData) {
    'use server'
    const id = formData.get('id') as string
    const returnI = formData.get('returnI') as string
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
        expiresAt: new Date(Date.now() + 5 * 86400000),
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
    revalidatePath('/admin/review')
    revalidatePath('/admin')
    revalidatePath(`/admin/${row.countrySlug}`)
    revalidatePath(`/admin/${row.countrySlug}/review`)
    revalidatePath(`/es/${row.countrySlug}`)
    revalidatePath(`/en/${row.countrySlug}`)
    revalidatePath(`/pt/${row.countrySlug}`)
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

  const countrySlugs = [...new Set(resources.map((r) => r.countrySlug))]
  const countryRows = await prisma.country.findMany({
    where: { slug: { in: countrySlugs } },
    select: { slug: true, nameEs: true, cca2: true, flag: true },
  })
  const countryMap = Object.fromEntries(countryRows.map((c) => [c.slug, c]))

  const currentCountry = countryMap[resource.countrySlug]

  return (
    <div className="max-w-2xl">
      <Breadcrumb />

      {/* Controls */}
      <div className="flex items-center mb-3">
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
