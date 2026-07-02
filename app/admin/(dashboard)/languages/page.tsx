import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getSession } from '@/lib/lucia'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { LOCALES, LOCALE_LABELS, DEFAULT_LOCALE, type Locale } from '@/lib/locale-content'
import { logAction } from '@/lib/audit'
import { flagUrl } from '@/lib/country-iso'
import { FlagImage } from '@/components/admin/FlagImage'
import { LocaleToggle } from '@/components/admin/LocaleToggle'
import { CountryLocaleRow } from '@/components/admin/CountryLocaleRow'

async function countResourcesWithContent(code: Locale): Promise<number> {
  switch (code) {
    case 'es': return prisma.resource.count()
    case 'en': return prisma.resource.count({ where: { OR: [{ nameEn: { not: null } }, { notesEn: { not: null } }] } })
    case 'pt': return prisma.resource.count({ where: { OR: [{ namePt: { not: null } }, { notesPt: { not: null } }] } })
    case 'fr': return prisma.resource.count({ where: { OR: [{ nameFr: { not: null } }, { notesFr: { not: null } }] } })
    case 'de': return prisma.resource.count({ where: { OR: [{ nameDe: { not: null } }, { notesDe: { not: null } }] } })
  }
}

export default async function LanguagesPage() {
  const { user } = await getSession()
  if (!user) redirect('/admin/login')
  if (user.role !== 'ADMIN') redirect('/admin')

  const [localeRows, countries, resourceCounts] = await Promise.all([
    prisma.locale.findMany(),
    prisma.country.findMany({
      orderBy: { slug: 'asc' },
      select: { slug: true, nameEs: true, flag: true, cca2: true, active: true, enabledLocales: true },
    }),
    Promise.all(LOCALES.map((code) => countResourcesWithContent(code))),
  ])
  const byCode = Object.fromEntries(localeRows.map((r) => [r.code, r]))
  const activeCodes = LOCALES.filter((code) => byCode[code]?.active)
  const impactByCode = Object.fromEntries(LOCALES.map((code, i) => [code, resourceCounts[i]]))
  const provisioned = LOCALES.map((code) => ({ code, label: LOCALE_LABELS[code] }))

  async function toggleLocale(fd: FormData) {
    'use server'
    const { user } = await getSession()
    if (!user || user.role !== 'ADMIN') return
    const code = fd.get('code') as string
    if (!code || code === DEFAULT_LOCALE) return
    const current = await prisma.locale.findUnique({ where: { code } })
    if (!current) return
    const next = !current.active
    await prisma.locale.update({ where: { code }, data: { active: next } })
    await logAction({
      userEmail: user.email,
      action: 'LOCALE_TOGGLE',
      entityType: 'locale',
      entityId: code,
      entityName: LOCALE_LABELS[code as Locale] ?? code,
      detail: next ? 'activated' : 'deactivated',
    })
    // A locale toggle changes which routes 404/200 across the whole site.
    revalidatePath('/', 'layout')
  }

  async function updateCountryLocales(fd: FormData) {
    'use server'
    const { user } = await getSession()
    if (!user || user.role !== 'ADMIN') return
    const countrySlug = fd.get('countrySlug') as string
    if (!countrySlug) return
    const checked = fd.getAll('locale') as string[]
    // Always keep the default locale in an explicit restriction — a country
    // can't be locked out of the URL almost all real traffic uses. An empty
    // submission (everything unchecked) is unreachable from the UI since the
    // default locale's checkbox is always present and checked, but guard it
    // anyway: treat it as "no restriction" rather than "restrict to nothing".
    const enabledLocales = checked.length === 0 ? [] : Array.from(new Set([DEFAULT_LOCALE, ...checked]))
    await prisma.country.update({ where: { slug: countrySlug }, data: { enabledLocales } })
    await logAction({
      userEmail: user.email,
      action: 'COUNTRY_UPDATE',
      entityType: 'country',
      entityId: countrySlug,
      countrySlug,
      detail: `enabledLocales=${enabledLocales.join(',') || '(none, inherits all active)'}`,
    })
    revalidatePath('/', 'layout')
  }

  async function resetCountryLocales(fd: FormData) {
    'use server'
    const { user } = await getSession()
    if (!user || user.role !== 'ADMIN') return
    const countrySlug = fd.get('countrySlug') as string
    if (!countrySlug) return
    await prisma.country.update({ where: { slug: countrySlug }, data: { enabledLocales: [] } })
    await logAction({
      userEmail: user.email,
      action: 'COUNTRY_UPDATE',
      entityType: 'country',
      entityId: countrySlug,
      countrySlug,
      detail: 'enabledLocales reset to inherit all active',
    })
    revalidatePath('/', 'layout')
  }

  return (
    <div className="max-w-3xl">
      <nav className="flex items-center gap-2 mb-6 text-sm">
        <Link href="/admin" className="text-gray-400 hover:text-gray-700">Inicio</Link>
        <span className="text-gray-300">/</span>
        <span className="text-gray-900 font-medium">Idiomas</span>
      </nav>

      <h1 className="text-xl font-bold text-gray-900 mb-1">Idiomas</h1>
      <p className="text-sm text-gray-500 mb-6">
        Activar/desactivar un idioma (arriba) no requiere desplegar, se aplica al instante en todo
        el sitio. Los checkboxes de abajo restringen qué idiomas ofrece cada país — una casilla
        marcada pero tenue significa que hereda el idioma sin restricción explícita todavía.
        Español no se puede desactivar ni excluir de un país.
      </p>

      {/*
        One empty form per country, rendered outside the table — a <form>
        can't be a valid child of <tr>/<table>, so each row's checkboxes
        below reference their form via the HTML `form="f-<slug>"` attribute
        instead of nesting a <form> inside the row.
      */}
      {countries.map((c) => (
        <form key={c.slug} id={`f-${c.slug}`} action={updateCountryLocales} className="hidden">
          <input type="hidden" name="countrySlug" value={c.slug} />
        </form>
      ))}

      <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left font-medium text-gray-700 px-4 py-3">País</th>
              {provisioned.map((l) => (
                <th key={l.code} className="text-center font-medium text-gray-700 px-2 py-3 min-w-[84px]">
                  <div className="flex flex-col items-center gap-1.5">
                    <span>{l.label}</span>
                    <LocaleToggle
                      code={l.code}
                      label={l.label}
                      active={activeCodes.includes(l.code)}
                      resourceCount={impactByCode[l.code]}
                      disabled={l.code === DEFAULT_LOCALE}
                      action={toggleLocale}
                    />
                  </div>
                </th>
              ))}
              <th className="w-8" />
            </tr>
          </thead>
          <tbody>
            {countries.map((c) => (
              <tr key={c.slug} className="border-b border-gray-50 last:border-0">
                <td className="px-4 py-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <FlagImage
                      src={c.cca2 ? `https://flagcdn.com/w40/${c.cca2}.png` : flagUrl(c.slug)}
                      flag={c.flag}
                      size={18}
                    />
                    <span className="truncate">{c.nameEs}</span>
                    {!c.active && (
                      <span className="shrink-0 text-[10px] text-gray-400 border border-gray-200 rounded px-1 leading-4">off</span>
                    )}
                  </div>
                </td>
                <CountryLocaleRow
                  countrySlug={c.slug}
                  provisioned={provisioned}
                  activeCodes={activeCodes}
                  enabledLocales={c.enabledLocales}
                  resetAction={resetCountryLocales}
                />
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
