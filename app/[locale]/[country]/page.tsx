import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { prisma } from '@/lib/prisma'
import { ActionCard } from '@/components/ActionCard'
import { CityList, type CityEntry } from '@/components/CityList'
import { serializeResource } from '@/lib/types'
import { notPastEventFilter, MIN_CITY_RESOURCES } from '@/lib/resource-visibility'
import { flagUrl } from '@/lib/country-iso'
import { localizeSuffixed, INTL_LOCALE, effectiveLocalesForCountry, type Locale } from '@/lib/locale-content'
import { getActiveLocales, getCountryLocaleMap } from '@/lib/locale-active'
import { SITE_URL } from '@/lib/resource-detail'
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
  params: Promise<{ locale: string; country: string }>
}): Promise<Metadata> {
  const { locale, country: urlSlug } = await params

  const [country, t, activeLocales, countryLocaleMap] = await Promise.all([
    prisma.country.findUnique({ where: { slug: urlSlug, active: true } }),
    getTranslations({ locale, namespace: 'country' }),
    getActiveLocales(),
    getCountryLocaleMap(),
  ])
  if (!country) return {}

  const name = localizeSuffixed(country, 'name', locale) ?? country.nameEs
  const heading = t('fromCountry', { name })

  const effectiveLocales = effectiveLocalesForCountry(
    country.slug,
    activeLocales.map((l) => l.code),
    countryLocaleMap,
  )

  return {
    title: `${heading}: ${locale === 'en' ? 'How to help with the Venezuela earthquake' : 'Cómo ayudar con el terremoto de Venezuela'} | VEconecta`,
    description:
      locale === 'en'
        ? `Verified donation channels, free calls, and how to find missing family from ${name}. Updated initiatives for Venezuelans.`
        : `Iniciativas verificadas para venezolanos en ${name}: donaciones, llamadas gratis, búsqueda de familiares.`,
    openGraph: {
      type: 'website',
      siteName: 'VEconecta',
      images: [{ url: `/api/og?locale=${locale}`, width: 1200, height: 630 }],
    },
    alternates: {
      canonical: `${SITE_URL}/${locale}/${urlSlug}`,
      languages: Object.fromEntries(
        effectiveLocales.map((l) => [l, `${SITE_URL}/${l}/${country.slug}`]),
      ),
    },
  }
}

export default async function CountryPage({
  params,
}: {
  params: Promise<{ locale: string; country: string }>
}) {
  const { locale, country: urlSlug } = await params
  setRequestLocale(locale)

  const tNav = await getTranslations('nav')

  const [country, activeLocales, countryLocaleMap] = await Promise.all([
    prisma.country.findUnique({
      where: { slug: urlSlug, active: true },
      include: {
        resources: {
          where: { status: ResourceStatus.PUBLISHED, ...notPastEventFilter() },
          orderBy: { createdAt: 'asc' },
          include: { city: true },
        },
      },
    }),
    getActiveLocales(),
    getCountryLocaleMap(),
  ])
  if (!country) notFound()

  const effectiveLocales = effectiveLocalesForCountry(
    country.slug,
    activeLocales.map((l) => l.code),
    countryLocaleMap,
  )
  if (!effectiveLocales.includes(locale)) notFound()

  const slug = country.slug

  const [globalResources, citiesWithCount] = await Promise.all([
    prisma.resource.findMany({
      where: { countrySlug: 'global', status: ResourceStatus.PUBLISHED, ...notPastEventFilter() },
      orderBy: { createdAt: 'asc' },
      include: { city: true },
    }),
    prisma.city.findMany({
      where: { countrySlug: slug },
      include: {
        _count: {
          select: { resources: { where: { status: ResourceStatus.PUBLISHED, ...notPastEventFilter() } } },
        },
      },
    }),
  ])

  const name = localizeSuffixed(country, 'name', locale) ?? country.nameEs

  const realCities: CityEntry[] = citiesWithCount
    .filter((c) => c._count.resources >= MIN_CITY_RESOURCES)
    .map((c) => ({
      name: localizeSuffixed(c, 'name', locale) ?? c.nameEs,
      slug: c.slug,
      count: c._count.resources,
    }))
    .sort((a, b) => b.count - a.count)

  const hasCitySelector = realCities.length >= 2

  const flag40 = flagUrl(slug, 'w40')
  const flag80 = flagUrl(slug, 'w80')

  const lastUpdated = country.lastUpdatedAt
    ? new Intl.DateTimeFormat(INTL_LOCALE[locale as keyof typeof INTL_LOCALE] ?? INTL_LOCALE.es, {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }).format(country.lastUpdatedAt)
    : null

  if (hasCitySelector) {
    return (
      <main className="min-h-screen bg-white">
        {/* Breadcrumb */}
        <div className="bg-coco h-10 flex items-center px-5 gap-1.5">
          <Link
            href={`/${locale}`}
            className="font-sans font-normal text-sm text-caribe hover:underline"
          >
            {tNav('home')}
          </Link>
          <span className="font-sans text-sm text-[#b8b8b8]">›</span>
          <span className="font-sans font-normal text-sm text-[#141414]">{name}</span>
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
              {name}
            </h1>
          </div>
        </div>

        <CityList cities={realCities} countrySlug={urlSlug} locale={locale} />
      </main>
    )
  }

  // No city selector: show all resources directly
  const serializedCountry = country.resources.map(serializeResource)
  const serializedGlobal = globalResources.map(serializeResource)

  const resourcesByCategory = CATEGORY_ORDER.reduce(
    (acc, cat) => {
      acc[cat] = [
        ...serializedCountry.filter((r) => r.category === cat),
        ...serializedGlobal.filter((r) => r.category === cat),
      ]
      return acc
    },
    {} as Record<ResourceCategory, typeof serializedCountry>,
  )

  return (
    <main className="min-h-screen bg-white">
      {/* Breadcrumb */}
      <div className="bg-coco h-10 flex items-center px-5 gap-1.5">
        <Link
          href={`/${locale}`}
          className="font-sans font-normal text-sm text-caribe hover:underline"
        >
          {tNav('home')}
        </Link>
        <span className="font-sans text-sm text-[#b8b8b8]">›</span>
        <span className="font-sans font-normal text-sm text-[#141414]">{name}</span>
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
            {name}
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
    </main>
  )
}
