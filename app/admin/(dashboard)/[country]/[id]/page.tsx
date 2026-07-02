import { notFound, redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/lucia'
import { ResourceCategory, ResourceStatus } from '@prisma/client'
import { revalidatePath } from 'next/cache'
import Link from 'next/link'
import { UrlField } from '@/components/admin/UrlField'
import { LanguageTabs } from '@/components/admin/LanguageTabs'
import { NameTabs } from '@/components/admin/NameTabs'
import { logAction, touchCountry } from '@/lib/audit'
import { FlagImage } from '@/components/admin/FlagImage'
import { flagUrl } from '@/lib/country-iso'
import { LOCALES } from '@/lib/locale-content'
import { CitySelect } from '@/components/admin/CitySelect'
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

  const [resource, countryRecord, cities] = await Promise.all([
    prisma.resource.findUnique({ where: { id } }),
    prisma.country.findUnique({ where: { slug: country } }),
    prisma.city.findMany({ where: { countrySlug: country }, orderBy: { nameEs: 'asc' } }),
  ])
  if (!resource || resource.countrySlug !== country) notFound()

  async function save(fd: FormData) {
    'use server'
    const { user } = await getSession()
    if (!user) return
    if (user.role === 'EDITOR' && !user.countrySlugs.includes(country)) return
    const expiresRaw = fd.get('expiresAt') as string
    const name = (fd.get('name') as string).trim()
    const isAdmin = user.role === 'ADMIN'
    const newStatus = fd.get('status') as ResourceStatus
    const cityId = await resolveCityId(country, fd)
    await prisma.resource.update({
      where: { id },
      data: {
        name,
        nameEn: (fd.get('nameEn') as string).trim() || null,
        namePt: (fd.get('namePt') as string).trim() || null,
        category: fd.get('category') as ResourceCategory,
        status: newStatus,
        url: (fd.get('url') as string).trim() || null,
        phone: (fd.get('phone') as string).trim() || null,
        bizum: (fd.get('bizum') as string).trim() || null,
        cityId,
        address: (fd.get('address') as string).trim() || null,
        schedule: (fd.get('schedule') as string).trim() || null,
        free: fd.get('free') === 'on',
        notesEs: (fd.get('notesEs') as string).trim() || null,
        notesEn: (fd.get('notesEn') as string).trim() || null,
        notesPt: (fd.get('notesPt') as string).trim() || null,
        expiresAt: expiresRaw ? new Date(expiresRaw) : null,
        verifiedAt: isAdmin ? new Date() : undefined,
        verifiedBy: isAdmin ? user.email : undefined,
      },
    })
    await logAction({ userEmail: user.email, action: 'RESOURCE_UPDATE', entityType: 'resource', entityId: id, entityName: name, countrySlug: country, detail: newStatus })
    await touchCountry(country)
    revalidatePath(`/admin/${country}`)
    for (const l of LOCALES) revalidatePath(`/${l}/${country}`)
    for (const l of LOCALES) revalidatePath(`/${l}`)
    redirect(returnTo)
  }

  const expFormatted = resource.expiresAt
    ? resource.expiresAt.toISOString().split('T')[0]
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
          <NameTabs defaultValues={{
            es: resource.name,
            en: resource.nameEn ?? '',
            pt: resource.namePt ?? '',
          }} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Sel label="Categoría" name="category" value={resource.category} opts={CATEGORIES} labels={CATEGORY_LABELS} />
          <Sel label="Estado" name="status" value={resource.status} opts={STATUSES} labels={STATUS_LABELS} />
        </div>

        <UrlField defaultValue={resource.url ?? ''} />

        <div className="grid grid-cols-2 gap-4">
          <F label="Teléfono / WhatsApp" name="phone" defaultValue={resource.phone ?? ''} />
          <F label="Bizum" name="bizum" defaultValue={resource.bizum ?? ''} />
        </div>

        <CitySelect cities={cities} defaultValue={resource.cityId ?? ''} />
        <F label="Dirección" name="address" defaultValue={resource.address ?? ''} />
        <F label="Horario" name="schedule" defaultValue={resource.schedule ?? ''} />
        <F label="Vence (fecha)" name="expiresAt" type="date" defaultValue={expFormatted} />

        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" name="free" defaultChecked={resource.free} className="h-4 w-4 rounded" />
          <span className="text-sm text-gray-700">Gratuito</span>
        </label>

        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">Descripción por idioma</p>
          <LanguageTabs defaultValues={{
            es: resource.notesEs ?? '',
            en: resource.notesEn ?? '',
            pt: resource.notesPt ?? '',
          }} />
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
