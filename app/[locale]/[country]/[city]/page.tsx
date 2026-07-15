import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { prisma } from '@/lib/prisma'
import { ActionCard } from '@/components/ActionCard'
import { ReportForm } from '@/components/ReportForm'
import { serializeResource } from '@/lib/types'
import { notPastEventFilter, MIN_CITY_RESOURCES } from '@/lib/resource-visibility'
import { flagUrl } from '@/lib/country-iso'
import { localizeSuffixed, effectiveLocalesForCountry, type Locale } from '@/lib/locale-content'
import { getActiveLocales, getCountryLocaleMap } from '@/lib/locale-active'
import { buildAlternates } from '@/lib/hreflang'
import { ResourceCategory, ResourceStatus } from '@prisma/client'
import type { Metadata } from 'next'

const CATEGORY_ORDER: ResourceCategory[] = [
  'DONATE_PHYSICALLY',
  'DONATE_MONEY',
  'FIND_FAMILY',
  'CALL_FREE',
  'SEND_MONEY',
  'DIGITAL_BRIDGE',
  'CONSULAR',
  'MENTAL_HEALTH',
]

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; country: string; city: string }>
}): Promise<Metadata> {
  const { locale, country: urlSlug, city: citySlug } = await params
  const [country, activeLocales, countryLocaleMap] = await Promise.all([
    prisma.country.findUnique({ where: { slug: urlSlug, active: true } }),
    getActiveLocales(),
    getCountryLocaleMap(),
  ])
  if (!country) return {}

  const cityRecord = await prisma.city.findFirst({ where: { countrySlug: country.slug, slug: citySlug } })
  if (!cityRecord) return {}

  const effectiveLocales = effectiveLocalesForCountry(
    country.slug,
    activeLocales.map((l) => l.code),
    countryLocaleMap,
  )
  const cityName = localizeSuffixed(cityRecord, 'name', locale) ?? cityRecord.nameEs

  const countryName = localizeSuffixed(country, 'name', locale) ?? country.nameEs

  // Below MIN_CITY_RESOURCES the page is mostly national/global resources
  // shared with every other under-threshold city in the country — keep it
  // reachable (e.g. from a resource's city pill) but don't let it compete
  // with near-duplicate content in search results.
  const cityResourceCount = await prisma.resource.count({
    where: {
      countrySlug: country.slug,
      cityId: cityRecord.id,
      status: ResourceStatus.PUBLISHED,
      ...notPastEventFilter(),
    },
  })

  return {
    title: `${cityName}, ${countryName} | VEconecta`,
    description:
      locale === 'en'
        ? `Verified initiatives for Venezuelans in ${cityName}, ${countryName}.`
        : `Iniciativas verificadas para venezolanos en ${cityName}, ${countryName}.`,
    ...(cityResourceCount < MIN_CITY_RESOURCES ? { robots: { index: false, follow: true } } : {}),
    openGraph: {
      type: 'website',
      siteName: 'VEconecta',
      images: [{ url: `/api/og?locale=${locale}`, width: 1200, height: 630 }],
    },
    alternates: buildAlternates(locale, effectiveLocales, (l) => `/${l}/${country.slug}/${citySlug}`),
  }
}

export default async function CityPage({
  params,
}: {
  params: Promise<{ locale: string; country: string; city: string }>
}) {
  const { locale, country: urlSlug, city: citySlug } = await params
  setRequestLocale(locale)

  const tNav = await getTranslations('nav')

  const [country, activeLocales, countryLocaleMap] = await Promise.all([
    prisma.country.findUnique({ where: { slug: urlSlug, active: true } }),
    getActiveLocales(),
    getCountryLocaleMap(),
  ])
  if (!country) notFound()

  const effectiveLocales = effectiveLocalesForCountry(
    country.slug,
    activeLocales.map((l) => l.code),
    countryLocaleMap,
  )
  if (!effectiveLocales.includes(locale)) {
    // Same policy as the country page: send visitors (and any indexed/shared
    // old links) to the closest locale this country actually offers, in the
    // site's own priority order, instead of a hard 404.
    if (effectiveLocales.length === 0) notFound()
    redirect(`/${effectiveLocales[0]}/${country.slug}/${citySlug}`)
  }

  const countrySlug = country.slug

  const [cityRecord, allCountryResources, globalResources] = await Promise.all([
    prisma.city.findFirst({ where: { countrySlug, slug: citySlug } }),
    prisma.resource.findMany({
      where: { countrySlug, status: ResourceStatus.PUBLISHED, ...notPastEventFilter() },
      orderBy: { createdAt: 'asc' },
      include: { city: true },
    }),
    prisma.resource.findMany({
      where: { countrySlug: 'global', status: ResourceStatus.PUBLISHED, ...notPastEventFilter() },
      orderBy: { createdAt: 'asc' },
      include: { city: true },
    }),
  ])

  if (!cityRecord) notFound()

  const cityName = localizeSuffixed(cityRecord, 'name', locale) ?? cityRecord.nameEs
  const countryName = localizeSuffixed(country, 'name', locale) ?? country.nameEs

  // City resources = FK match + no-city (national) resources
  const cityResources = allCountryResources.filter(
    (r) => r.cityId === cityRecord.id || r.cityId === null,
  )

  const serializedCity = cityResources.map(serializeResource)
  const serializedGlobal = globalResources.map(serializeResource)

  const resourcesByCategory = CATEGORY_ORDER.reduce(
    (acc, cat) => {
      acc[cat] = [
        ...serializedCity.filter((r) => r.category === cat),
        ...serializedGlobal.filter((r) => r.category === cat),
      ]
      return acc
    },
    {} as Record<ResourceCategory, typeof serializedCity>,
  )

  const totalResources = cityResources.length + globalResources.length

  const flag40 = flagUrl(countrySlug, 'w40')
  const flag80 = flagUrl(countrySlug, 'w80')

  return (
    <main className="min-h-screen bg-white">
      {/* Breadcrumb */}
      <div className="bg-coco h-10 flex items-center px-5 gap-1.5 overflow-x-auto whitespace-nowrap">
        <Link
          href={`/${locale}`}
          className="font-sans font-normal text-sm text-caribe hover:underline shrink-0"
        >
          {tNav('home')}
        </Link>
        <span className="font-sans text-sm text-[#b8b8b8] shrink-0">›</span>
        <Link
          href={`/${locale}/${urlSlug}`}
          className="font-sans font-normal text-sm text-caribe hover:underline shrink-0"
        >
          {countryName}
        </Link>
        <span className="font-sans text-sm text-[#b8b8b8] shrink-0">›</span>
        <span className="font-sans font-normal text-sm text-[#141414] shrink-0">{cityName}</span>
      </div>

      {/* Hero */}
      <div className="px-5 pt-6 pb-8 flex justify-center">
        <div className="flex items-center gap-3">
          {flag40 && (
            <img
              src={flag40}
              srcSet={flag80 ? `${flag80} 2x` : undefined}
              width={36}
              height={24}
              alt=""
              className="object-cover shrink-0"
            />
          )}
          <h1 className="font-display font-extrabold text-[28px] leading-[1.1] tracking-[-0.01em] text-[#141414]">
            {cityName}
          </h1>
        </div>
      </div>

      {CATEGORY_ORDER.map((category) => (
        <ActionCard
          key={category}
          category={category}
          resources={resourcesByCategory[category] ?? []}
          locale={locale as Locale}
        />
      ))}

      <div className="h-px bg-[rgba(20,20,20,0.12)]" />

      <div className="px-5 flex justify-center">
        <ReportForm countrySlug={countrySlug} />
      </div>
    </main>
  )
}
