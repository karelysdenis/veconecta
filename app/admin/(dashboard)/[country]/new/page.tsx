import { redirect } from 'next/navigation'
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
import { LOCALES, localizedFieldsFromForm } from '@/lib/locale-content'
import { CitySelect } from '@/components/admin/CitySelect'
import { KindDateFields } from '@/components/admin/KindDateFields'
import { resolveCityId } from '@/lib/city'

const CATEGORIES = Object.values(ResourceCategory)

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

const STATUSES = Object.values(ResourceStatus)

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Borrador',
  PUBLISHED: 'Publicado',
  ARCHIVED: 'Archivado',
}

export default async function NewResourcePage({
  params,
}: {
  params: Promise<{ country: string }>
}) {
  const { country } = await params
  const { user } = await getSession()
  if (!user) redirect('/admin/login')
  if (user.role === 'EDITOR' && !user.countrySlugs.includes(country)) redirect('/admin')

  const [countryRecord, cities] = await Promise.all([
    prisma.country.findUnique({ where: { slug: country } }),
    prisma.city.findMany({ where: { countrySlug: country }, orderBy: { nameEs: 'asc' } }),
  ])

  async function create(fd: FormData) {
    'use server'
    const { user } = await getSession()
    if (!user) return
    if (user.role === 'EDITOR' && !user.countrySlugs.includes(country)) return
    const validUntilRaw = fd.get('validUntil') as string
    const kind = (fd.get('kind') as ResourceKind) || ResourceKind.PERMANENT
    const eventStartsAtRaw = fd.get('eventStartsAt') as string
    const eventEndsAtRaw = fd.get('eventEndsAt') as string
    const name = (fd.get('name') as string).trim()
    const cityId = await resolveCityId(country, fd)
    const resource = await prisma.resource.create({
      data: {
        countrySlug: country,
        name,
        ...localizedFieldsFromForm(fd, 'name'),
        category: fd.get('category') as ResourceCategory,
        status: (fd.get('status') as ResourceStatus) || ResourceStatus.DRAFT,
        url: (fd.get('url') as string).trim() || null,
        phone: (fd.get('phone') as string).trim() || null,
        paymentKey: (fd.get('paymentKey') as string).trim() || null,
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
        verifiedAt: user.role === 'ADMIN' ? new Date() : null,
        verifiedBy: user.role === 'ADMIN' ? user.email : null,
      },
    })
    await logAction({ userEmail: user.email, action: 'RESOURCE_CREATE', entityType: 'resource', entityId: resource.id, entityName: name, countrySlug: country })
    await touchCountry(country)
    revalidatePath(`/admin/${country}`)
    for (const l of LOCALES) revalidatePath(`/${l}/${country}`)
    for (const l of LOCALES) revalidatePath(`/${l}`)
    redirect(`/admin/${country}`)
  }

  const countryName = countryRecord?.nameEs ?? country

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
          {countryName}
        </Link>
        <span className="text-gray-300">/</span>
        <span className="text-gray-900 font-medium">Nuevo</span>
      </nav>

      <form action={create} className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">Nombre por idioma</p>
          <NameTabs />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Sel label="Categoría" name="category" opts={CATEGORIES} labels={CATEGORY_LABELS} />
          <Sel label="Estado" name="status" opts={STATUSES} labels={STATUS_LABELS} value={ResourceStatus.DRAFT} />
        </div>

        <CitySelect cities={cities} />

        <UrlField />

        <div className="grid grid-cols-2 gap-4">
          <F label="Teléfono / WhatsApp" name="phone" />
          <F label={country === 'spain' ? 'Bizum' : 'Clave de pago'} name="paymentKey" />
        </div>

        <F label="Dirección" name="address" />
        <F label="Horario" name="schedule" />
        <KindDateFields />

        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" name="free" defaultChecked className="h-4 w-4 rounded" />
          <span className="text-sm text-gray-700">Gratuito</span>
        </label>

        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">Descripción por idioma</p>
          <LanguageTabs />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Link href={`/admin/${country}`} className="text-sm text-gray-600 hover:underline px-4 py-2">
            Cancelar
          </Link>
          <button
            type="submit"
            className="bg-red-700 text-white text-sm font-medium px-5 py-2 rounded-lg hover:bg-red-800"
          >
            Crear
          </button>
        </div>
      </form>
    </div>
  )
}

function F({
  label, name, type = 'text', required = false,
}: {
  label: string; name: string; type?: string; required?: boolean
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        type={type}
        name={name}
        required={required}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300"
      />
    </div>
  )
}

function Sel({ label, name, opts, labels, value }: { label: string; name: string; opts: string[]; labels?: Record<string, string>; value?: string }) {
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
