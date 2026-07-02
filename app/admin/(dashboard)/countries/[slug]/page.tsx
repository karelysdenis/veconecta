import { notFound, redirect } from 'next/navigation'
import { getSession } from '@/lib/lucia'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import Link from 'next/link'
import { flagUrl } from '@/lib/country-iso'
import { FlagImage } from '@/components/admin/FlagImage'
import { cityToSlug } from '@/lib/slugify'
import { LOCALES, LOCALE_LABELS, DEFAULT_LOCALE } from '@/lib/locale-content'
import { getActiveLocales } from '@/lib/locale-active'
import { logAction } from '@/lib/audit'
import { ResourceStatus } from '@prisma/client'

export default async function EditCountryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ error?: string }>
}) {
  const { slug } = await params
  const { error } = await searchParams
  const { user } = await getSession()
  if (!user) redirect('/admin/login')
  if (user.role !== 'ADMIN') redirect('/admin')

  const [country, cities, activeLocales] = await Promise.all([
    prisma.country.findUnique({ where: { slug } }),
    prisma.city.findMany({
      where: { countrySlug: slug },
      include: { _count: { select: { resources: { where: { status: ResourceStatus.PUBLISHED } } } } },
      orderBy: { nameEs: 'asc' },
    }),
    getActiveLocales(),
  ])
  if (!country) notFound()

  async function save(fd: FormData) {
    'use server'
    const { user } = await getSession()
    if (!user || user.role !== 'ADMIN') return
    const submittedLocales = fd.getAll('enabledLocales') as string[]
    // Empty means "no restriction" and must stay empty. Any non-empty
    // selection always keeps the default locale in, even though its
    // checkbox is disabled in the form and never actually submits —
    // excluding 'es' would 404 the URL almost all real traffic uses.
    const enabledLocales =
      submittedLocales.length === 0 ? [] : Array.from(new Set([DEFAULT_LOCALE, ...submittedLocales]))
    await prisma.country.update({
      where: { slug },
      data: {
        nameEs: (fd.get('nameEs') as string).trim(),
        nameEn: (fd.get('nameEn') as string).trim(),
        namePt: (fd.get('namePt') as string).trim() || null,
        nameFr: (fd.get('nameFr') as string).trim() || null,
        nameDe: (fd.get('nameDe') as string).trim() || null,
        flag: (fd.get('flag') as string).trim(),
        cca2: (fd.get('cca2') as string).trim().toLowerCase() || null,
        active: fd.get('active') === 'on',
        enabledLocales,
      },
    })
    await logAction({
      userEmail: user.email,
      action: 'COUNTRY_UPDATE',
      entityType: 'country',
      entityId: slug,
      entityName: (fd.get('nameEs') as string).trim(),
      countrySlug: slug,
    })
    revalidatePath('/admin')
    for (const l of LOCALES) revalidatePath(`/${l}`)
    for (const l of LOCALES) revalidatePath(`/${l}/${slug}`)
    redirect('/admin')
  }

  async function createCity(fd: FormData) {
    'use server'
    const { user } = await getSession()
    if (!user || user.role !== 'ADMIN') return
    const nameEs = (fd.get('nameEs') as string).trim()
    if (!nameEs) return
    try {
      await prisma.city.create({
        data: {
          countrySlug: slug,
          slug: cityToSlug(nameEs),
          nameEs,
          nameEn: (fd.get('nameEn') as string).trim() || null,
          namePt: (fd.get('namePt') as string).trim() || null,
          nameFr: (fd.get('nameFr') as string).trim() || null,
          nameDe: (fd.get('nameDe') as string).trim() || null,
        },
      })
    } catch (e: unknown) {
      if ((e as { code?: string })?.code === 'P2002') {
        redirect(`/admin/countries/${slug}?error=city-duplicate`)
      }
      throw e
    }
    revalidatePath(`/admin/countries/${slug}`)
  }

  async function deleteCity(fd: FormData) {
    'use server'
    const { user } = await getSession()
    if (!user || user.role !== 'ADMIN') return
    const cityId = fd.get('cityId') as string
    if (!cityId) return
    const count = await prisma.resource.count({ where: { cityId, status: ResourceStatus.PUBLISHED } })
    if (count > 0) return
    await prisma.city.delete({ where: { id: cityId, countrySlug: slug } })
    revalidatePath(`/admin/countries/${slug}`)
  }

  return (
    <div className="max-w-2xl">
      <nav className="flex items-center gap-2 mb-6 text-sm">
        <Link href="/admin" className="text-gray-400 hover:text-gray-700">Inicio</Link>
        <span className="text-gray-300">/</span>
        <span className="text-gray-900 font-medium">Editar país</span>
      </nav>

      <div className="flex items-center gap-3 mb-6">
        <FlagImage
          src={country.cca2 ? `https://flagcdn.com/w80/${country.cca2}.png` : flagUrl(country.slug, 'w80')}
          flag={country.flag}
          size={48}
          imgClassName="rounded-sm object-cover"
        />
        <h1 className="text-xl font-bold text-gray-900">{country.nameEs}</h1>
      </div>

      <form action={save} className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Slug <span className="text-xs text-gray-400 font-normal">(no editable)</span>
            </label>
            <input
              type="text"
              value={country.slug}
              disabled
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-400 cursor-not-allowed"
            />
          </div>
          <F label="Código ISO" name="cca2" defaultValue={country.cca2 ?? ''} placeholder="ej: co" note="Para mostrar la bandera" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <F label="Nombre en español" name="nameEs" defaultValue={country.nameEs} required />
          <F label="Nombre en inglés" name="nameEn" defaultValue={country.nameEn ?? ''} required />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <F label="Nombre en portugués" name="namePt" defaultValue={country.namePt ?? ''} />
          <F label="Nombre en francés" name="nameFr" defaultValue={country.nameFr ?? ''} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <F label="Nombre en alemán" name="nameDe" defaultValue={country.nameDe ?? ''} />
          <F label="Bandera (emoji)" name="flag" defaultValue={country.flag} />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Idiomas ofrecidos en este país
            <span className="text-xs text-gray-400 font-normal ml-1">
              (ninguno marcado = todos los idiomas activos del sitio; español siempre incluido)
            </span>
          </label>
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            {activeLocales.map((l) => {
              const isDefault = l.code === DEFAULT_LOCALE
              return (
                <label key={l.code} className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    name="enabledLocales"
                    value={l.code}
                    defaultChecked={isDefault || country.enabledLocales.includes(l.code)}
                    disabled={isDefault}
                    className="h-4 w-4 rounded disabled:opacity-50"
                  />
                  <span className="text-sm text-gray-700">{LOCALE_LABELS[l.code]}</span>
                </label>
              )
            })}
          </div>
        </div>

        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" name="active" defaultChecked={country.active} className="h-4 w-4 rounded" />
          <span className="text-sm text-gray-700">Visible en el selector público</span>
        </label>

        <div className="flex justify-end gap-3 pt-2">
          <Link href="/admin" className="text-sm text-gray-600 hover:underline px-4 py-2">
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

      {/* Ciudades */}
      <div className="mt-8">
        <h2 className="text-base font-semibold text-gray-900 mb-3">Ciudades</h2>

        {cities.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mb-4">
            {cities.map((city, i) => (
              <div
                key={city.id}
                className={`flex items-center gap-3 px-4 py-3 ${i < cities.length - 1 ? 'border-b border-gray-100' : ''}`}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{city.nameEs}</p>
                  <p className="text-xs text-gray-400">
                    {[city.nameEn, city.namePt, city.nameFr, city.nameDe].filter(Boolean).join(' · ')}
                    {city._count.resources > 0 && (
                      <span className="ml-2 text-gray-300">{city._count.resources} recursos</span>
                    )}
                  </p>
                </div>
                <p className="text-xs text-gray-300 font-mono shrink-0">{city.slug}</p>
                <Link
                  href={`/admin/countries/${slug}/cities/${city.id}`}
                  className="text-xs border border-gray-200 text-gray-600 px-2.5 py-1 rounded hover:bg-gray-50 shrink-0"
                >
                  Editar
                </Link>
                <form action={deleteCity}>
                  <input type="hidden" name="cityId" value={city.id} />
                  <button
                    type="submit"
                    disabled={city._count.resources > 0}
                    className="text-xs border border-red-100 text-red-400 px-2.5 py-1 rounded hover:bg-red-50 disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
                  >
                    Eliminar
                  </button>
                </form>
              </div>
            ))}
          </div>
        )}

        <form action={createCity} className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
          <p className="text-sm font-medium text-gray-700">Nueva ciudad</p>
          {error === 'city-duplicate' && (
            <p className="text-sm text-red-600">Ya existe una ciudad con ese slug. Prueba un nombre diferente.</p>
          )}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Nombre ES <span className="text-red-400">*</span></label>
              <input name="nameEs" required placeholder="ej: Bogotá"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Nombre EN</label>
              <input name="nameEn" placeholder="ej: Bogota"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Nombre PT</label>
              <input name="namePt" placeholder="ej: Bogotá"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Nombre FR</label>
              <input name="nameFr" placeholder="ej: Bogota"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Nombre DE</label>
              <input name="nameDe" placeholder="ej: Bogotá"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300" />
            </div>
          </div>
          <div className="flex justify-end">
            <button type="submit"
              className="text-sm bg-gray-900 text-white px-4 py-2 rounded-lg hover:bg-gray-700">
              + Añadir ciudad
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function F({
  label, name, defaultValue = '', required = false, placeholder = '', note,
}: {
  label: string; name: string; defaultValue?: string; required?: boolean; placeholder?: string; note?: string
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
        {note && <span className="text-xs text-gray-400 font-normal ml-1">({note})</span>}
      </label>
      <input
        type="text"
        name={name}
        defaultValue={defaultValue}
        required={required}
        placeholder={placeholder}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300"
      />
    </div>
  )
}
