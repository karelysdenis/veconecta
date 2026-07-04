import { notFound, redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/lucia'
import { ResourceCategory, ResourceKind, ResourceStatus } from '@prisma/client'
import { revalidatePath } from 'next/cache'
import Link from 'next/link'
import { UrlField } from '@/components/admin/UrlField'
import { LanguageTabs } from '@/components/admin/LanguageTabs'
import { NameTabs } from '@/components/admin/NameTabs'
import { logAction, touchCountry } from '@/lib/audit'
import { FlagImage } from '@/components/admin/FlagImage'
import { flagUrl } from '@/lib/country-iso'
import { LOCALES, localizedFieldsFromForm, localizedDefaultValues } from '@/lib/locale-content'
import { CitySelect } from '@/components/admin/CitySelect'
import { PaymentKeyField } from '@/components/admin/PaymentKeyField'
import { KindDateFields } from '@/components/admin/KindDateFields'
import { resolveCityId } from '@/lib/city'

const CATEGORIES = Object.values(ResourceCategory)
const STATUSES = Object.values(ResourceStatus)

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

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Borrador',
  PUBLISHED: 'Publicado',
  ARCHIVED: 'Archivado',
}

function sanitizeReturnTo(raw: unknown, fallback: string) {
  if (typeof raw !== 'string' || !raw.startsWith('/admin/') || raw.startsWith('//')) return fallback
  return raw
}

export default async function EditResourcePage({
  params,
  searchParams,
}: {
  params: Promise<{ country: string; id: string }>
  searchParams: Promise<{ returnTo?: string }>
}) {
  const { country, id } = await params
  const { returnTo: rawReturnTo } = await searchParams
  const { user } = await getSession()
  if (!user) redirect('/admin/login')
  if (user.role === 'EDITOR' && !user.countrySlugs.includes(country)) redirect('/admin')

  const returnTo = sanitizeReturnTo(rawReturnTo, `/admin/${country}`)

  const [resource, countryRecord, cities, allCountries] = await Promise.all([
    prisma.resource.findUnique({ where: { id } }),
    prisma.country.findUnique({ where: { slug: country } }),
    prisma.city.findMany({ where: { countrySlug: country }, orderBy: { nameEs: 'asc' } }),
    user.role === 'ADMIN'
      ? prisma.country.findMany({ where: { active: true }, orderBy: { nameEs: 'asc' }, select: { slug: true, nameEs: true } })
      : Promise.resolve(null),
  ])
  if (!resource || resource.countrySlug !== country) notFound()

  async function save(fd: FormData) {
    'use server'
    const { user } = await getSession()
    if (!user) return
    if (user.role === 'EDITOR' && !user.countrySlugs.includes(country)) return

    // Ownership guard: verify the resource belongs to the country in the URL
    const existing = await prisma.resource.findUnique({ where: { id }, select: { countrySlug: true } })
    if (!existing || existing.countrySlug !== country) return

    const isAdmin = user.role === 'ADMIN'
    const requestedCountry = (fd.get('countrySlug') as string) || country
    // Validate the target country exists and is active before trusting it
    const newCountrySlug = isAdmin && requestedCountry !== country
      ? (await prisma.country.findFirst({ where: { slug: requestedCountry, active: true }, select: { slug: true } }))?.slug ?? country
      : country
    const countryChanged = newCountrySlug !== country
    const validUntilRaw = fd.get('validUntil') as string
    const kind = (fd.get('kind') as ResourceKind) || ResourceKind.PERMANENT
    const eventStartsAtRaw = fd.get('eventStartsAt') as string
    const eventEndsAtRaw = fd.get('eventEndsAt') as string
    const name = (fd.get('name') as string).trim()
    const newStatus = fd.get('status') as ResourceStatus
    const cityId = countryChanged ? null : await resolveCityId(country, fd)
    await prisma.resource.update({
      where: { id },
      data: {
        name,
        ...localizedFieldsFromForm(fd, 'name'),
        category: fd.get('category') as ResourceCategory,
        status: newStatus,
        url: (fd.get('url') as string).trim() || null,
        phone: (fd.get('phone') as string).trim() || null,
        paymentKey: (fd.get('paymentKey') as string).trim() || null,
        countrySlug: newCountrySlug,
        cityId,
        address: (fd.get('address') as string).trim() || null,
        schedule: (fd.get('schedule') as string).trim() || null,
        free: fd.get('free') === 'on',
        notesEs: (fd.get('notesEs') as string).trim() || null,
        ...localizedFieldsFromForm(fd, 'notes'),
        kind,
        validUntil: kind === ResourceKind.PERMANENT && validUntilRaw ? new Date(validUntilRaw) : null,
        eventStartsAt: kind === ResourceKind.EVENT && eventStartsAtRaw ? new Date(eventStartsAtRaw) : null,
        eventEndsAt: kind === ResourceKind.EVENT && eventEndsAtRaw ? new Date(eventEndsAtRaw) : null,
        verifiedAt: isAdmin ? new Date() : undefined,
        verifiedBy: isAdmin ? user.email : undefined,
      },
    })
    const logDetail = countryChanged ? `${country} → ${newCountrySlug}` : newStatus
    await logAction({ userEmail: user.email, action: 'RESOURCE_UPDATE', entityType: 'resource', entityId: id, entityName: name, countrySlug: newCountrySlug, detail: logDetail })
    await touchCountry(country)
    if (countryChanged) await touchCountry(newCountrySlug)
    revalidatePath(`/admin/${country}`)
    revalidatePath(`/admin/${country}/review`)
    revalidatePath(`/admin/${newCountrySlug}`)
    revalidatePath(`/admin/${newCountrySlug}/review`)
    for (const l of LOCALES) revalidatePath(`/${l}/${country}`)
    for (const l of LOCALES) revalidatePath(`/${l}/${newCountrySlug}`)
    for (const l of LOCALES) revalidatePath(`/${l}`)
    redirect(countryChanged ? `/admin/${newCountrySlug}` : returnTo)
  }

  const validUntilFormatted = resource.validUntil
    ? resource.validUntil.toISOString().split('T')[0]
    : ''
  const eventStartsAtFormatted = resource.eventStartsAt
    ? resource.eventStartsAt.toISOString().split('T')[0]
    : ''
  const eventEndsAtFormatted = resource.eventEndsAt
    ? resource.eventEndsAt.toISOString().split('T')[0]
    : ''

  return (
    <div className="max-w-2xl">
      <nav className="flex items-center gap-2 mb-6 text-sm">
        <Link href="/admin" className="text-gray-400 hover:text-gray-700">Inicio</Link>
        <span className="text-gray-300">/</span>
        <Link href={`/admin/${country}`} className="text-gray-400 hover:text-gray-700 flex items-center gap-1.5">
          {countryRecord && (
            <FlagImage
              src={countryRecord.cca2 ? `https://flagcdn.com/w40/${countryRecord.cca2}.png` : flagUrl(countryRecord.slug)}
              flag={countryRecord.flag}
              size={16}
            />
          )}
          {countryRecord?.nameEs ?? country}
        </Link>
        <span className="text-gray-300">/</span>
        <span className="text-gray-900 font-medium truncate">{resource.name}</span>
      </nav>

      <form action={save} className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">Nombre por idioma</p>
          <NameTabs defaultValues={{ es: resource.name, ...localizedDefaultValues(resource, 'name') }} />
        </div>

        {allCountries && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">País</label>
            <select
              name="countrySlug"
              defaultValue={resource.countrySlug}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300"
            >
              {allCountries.map((c) => (
                <option key={c.slug} value={c.slug}>{c.nameEs}</option>
              ))}
            </select>
            <p className="text-xs text-gray-400 mt-1">Al cambiar de país la ciudad se restablece</p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <Sel label="Categoría" name="category" value={resource.category} opts={CATEGORIES} labels={CATEGORY_LABELS} />
          <Sel label="Estado" name="status" value={resource.status} opts={STATUSES} labels={STATUS_LABELS} />
        </div>

        <UrlField defaultValue={resource.url ?? ''} />

        <div className="grid grid-cols-2 gap-4">
          <F label="Teléfono / WhatsApp" name="phone" defaultValue={resource.phone ?? ''} />
          <PaymentKeyField initialCountrySlug={resource.countrySlug} defaultValue={resource.paymentKey ?? ''} />
        </div>

        <CitySelect cities={cities} defaultValue={resource.cityId ?? ''} />
        <F label="Dirección" name="address" defaultValue={resource.address ?? ''} />
        <F label="Horario" name="schedule" defaultValue={resource.schedule ?? ''} />
        <KindDateFields
          defaultKind={resource.kind}
          defaultValidUntil={validUntilFormatted}
          defaultEventStartsAt={eventStartsAtFormatted}
          defaultEventEndsAt={eventEndsAtFormatted}
        />

        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" name="free" defaultChecked={resource.free} className="h-4 w-4 rounded" />
          <span className="text-sm text-gray-700">Gratuito</span>
        </label>

        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">Descripción por idioma</p>
          <LanguageTabs defaultValues={{ es: resource.notesEs ?? '', ...localizedDefaultValues(resource, 'notes') }} />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Link href={returnTo} className="text-sm text-gray-600 hover:underline px-4 py-2">
            Cancelar
          </Link>
          <button
            type="submit"
            className="bg-red-700 text-white text-sm font-medium px-5 py-2 rounded-lg hover:bg-red-800"
          >
            Guardar cambios
          </button>
        </div>
      </form>
    </div>
  )
}

function F({
  label, name, type = 'text', defaultValue = '', required = false,
}: {
  label: string; name: string; type?: string; defaultValue?: string; required?: boolean
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        type={type}
        name={name}
        defaultValue={defaultValue}
        required={required}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300"
      />
    </div>
  )
}

function Sel({
  label, name, value, opts, labels,
}: {
  label: string; name: string; value: string; opts: string[]; labels?: Record<string, string>
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <select
        name={name}
        defaultValue={value}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300"
      >
        {opts.map((o) => (
          <option key={o} value={o}>{labels?.[o] ?? o}</option>
        ))}
      </select>
    </div>
  )
}

function TA({
  label, name, defaultValue = '',
}: {
  label: string; name: string; defaultValue?: string
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <textarea
        name={name}
        defaultValue={defaultValue}
        rows={3}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300 resize-none"
      />
    </div>
  )
}
