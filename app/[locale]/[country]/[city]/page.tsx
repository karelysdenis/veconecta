import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { prisma } from '@/lib/prisma'
import { ActionCard } from '@/components/ActionCard'
import { ReportForm } from '@/components/ReportForm'
import { serializeResource } from '@/lib/types'
import { flagUrl } from '@/lib/country-iso'
import { cityToSlug } from '@/lib/slugify'
import { ResourceCategory, ResourceStatus } from '@prisma/client'
import type { Metadata } from 'next'

const CATEGORY_ORDER: ResourceCategory[] = [
  'FIND_FAMILY',
  'CALL_FREE',
  'DONATE_MONEY',
  'SEND_MONEY',
  'DONATE_PHYSICALLY',
  'DIGITAL_BRIDGE',
  'CONSULAR',
  'MENTAL_HEALTH',
]

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; country: string; city: string }>
}): Promise<Metadata> {
  const { locale, country: countrySlug, city: citySlug } = await params
  const country = await prisma.country.findUnique({ where: { slug: countrySlug } })
  if (!country) return {}

  const countryName = locale === 'en' ? country.nameEn : country.nameEs

  // Find the canonical city name from slug
  const cityResource = await prisma.resource.findFirst({
    where: {
      countrySlug,
      status: ResourceStatus.PUBLISHED,
      city: { not: null },
    },
    select: { city: true },
  })
  const allCityResources = await prisma.resource.findMany({
    where: { countrySlug, status: ResourceStatus.PUBLISHED, city: { not: null } },
    select: { city: true },
  })
  const cityName =
    allCityResources.find((r) => r.city && cityToSlug(r.city) === citySlug)?.city ??
    citySlug

  return {
    title: `${cityName}, ${countryName} | VeConecta`,
    description:
      locale === 'en'
        ? `Verified resources for Venezuelans in ${cityName}, ${countryName}.`
        : `Recursos verificados para venezolanos en ${cityName}, ${countryName}.`,
    openGraph: {
      type: 'website',
      siteName: 'VeConecta',
      images: [{ url: '/api/og', width: 1200, height: 630 }],
    },
  }
}

export default async function CityPage({
  params,
}: {
  params: Promise<{ locale: string; country: string; city: string }>
}) {
  const { locale, country: countrySlug, city: citySlug } = await params
  setRequestLocale(locale)

  const [t, tNav] = await Promise.all([
    getTranslations('country'),
    getTranslations('nav'),
  ])

  const [country, allCountryResources, globalResources] = await Promise.all([
    prisma.country.findUnique({ where: { slug: countrySlug, active: true } }),
    prisma.resource.findMany({
      where: { countrySlug, status: ResourceStatus.PUBLISHED },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.resource.findMany({
      where: { countrySlug: 'global', status: ResourceStatus.PUBLISHED },
      orderBy: { createdAt: 'asc' },
    }),
  ])

  if (!country) notFound()

  // Find canonical city name from the slug
  const cityName =
    allCountryResources.find((r) => r.city && cityToSlug(r.city) === citySlug)?.city

  if (!cityName) notFound()

  const countryName =
    locale === 'en'
      ? country.nameEn
      : locale === 'pt'
        ? (country.namePt ?? country.nameEs)
        : country.nameEs

  // City resources = exact city match + no-city (national) resources + global
  const cityResources = allCountryResources.filter(
    (r) => r.city === cityName || !r.city || r.city.toLowerCase() === 'nacional',
  )

  const serializedResources = [...cityResources, ...globalResources].map(serializeResource)

  const resourcesByCategory = CATEGORY_ORDER.reduce(
    (acc, cat) => {
      acc[cat] = serializedResources.filter((r) => r.category === cat)
      return acc
    },
    {} as Record<ResourceCategory, typeof serializedResources>,
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
          href={`/${locale}/${countrySlug}`}
          className="font-sans font-normal text-sm text-caribe hover:underline shrink-0"
        >
          {countryName}
        </Link>
        <span className="font-sans text-sm text-[#b8b8b8] shrink-0">›</span>
        <span className="font-sans font-normal text-sm text-[#141414] shrink-0">{cityName}</span>
      </div>

      {/* Hero */}
      <div className="px-5 pt-5 pb-4 flex flex-col gap-2">
        <div className="flex items-center gap-3">
          {flag40 && (
            <img
              src={flag40}
              srcSet={flag80 ? `${flag80} 2x` : undefined}
              width={30}
              height={20}
              alt=""
              className="object-cover shrink-0"
            />
          )}
          <h1 className="font-display font-extrabold text-[28px] leading-[1.1] tracking-[-0.01em] text-[#141414]">
            {cityName}
          </h1>
        </div>
        <p className="font-sans font-light text-base text-[#808080]">
          {totalResources > 0 && `${totalResources} recursos verificados`}
        </p>
      </div>

      {CATEGORY_ORDER.map((category) => (
        <ActionCard
          key={category}
          category={category}
          resources={resourcesByCategory[category] ?? []}
          locale={locale as 'es' | 'en' | 'pt'}
        />
      ))}
      <div className="h-px bg-[rgba(20,20,20,0.12)]" />

      <div className="px-5 flex justify-center">
        <ReportForm countrySlug={countrySlug} />
      </div>
    </main>
  )
}
