import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { prisma } from '@/lib/prisma'
import { ActionCard } from '@/components/ActionCard'
import { ReportForm } from '@/components/ReportForm'
import { serializeResource } from '@/lib/types'
import { flagUrl } from '@/lib/country-iso'
import { localizeSuffixed, type Locale } from '@/lib/locale-content'
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
  const { locale, country: urlSlug, city: citySlug } = await params
  const country = await prisma.country.findUnique({ where: { slug: urlSlug, active: true } })
  if (!country) return {}

  const cityRecord = await prisma.city.findFirst({ where: { countrySlug: country.slug, slug: citySlug } })
  if (!cityRecord) return {}
  const cityName = localizeSuffixed(cityRecord, 'name', locale) ?? cityRecord.nameEs

  const countryName = localizeSuffixed(country, 'name', locale) ?? country.nameEs

  return {
    title: `${cityName}, ${countryName} | VEconecta`,
    description:
      locale === 'en'
        ? `Verified resources for Venezuelans in ${cityName}, ${countryName}.`
        : `Recursos verificados para venezolanos en ${cityName}, ${countryName}.`,
    openGraph: {
      type: 'website',
      siteName: 'VEconecta',
      images: [{ url: '/api/og', width: 1200, height: 630 }],
    },
  }
}

export default async function CityPage({
  params,
}: {
  params: Promise<{ locale: string; country: string; city: string }>
}) {
  const { locale, country: urlSlug, city: citySlug } = await params
  setRequestLocale(locale)

  const [t, tNav, tSearch] = await Promise.all([
    getTranslations('country'),
    getTranslations('nav'),
    getTranslations('search'),
  ])

  const country = await prisma.country.findUnique({ where: { slug: urlSlug, active: true } })
  if (!country) notFound()

  const countrySlug = country.slug

  const [cityRecord, allCountryResources, globalResources] = await Promise.all([
    prisma.city.findFirst({ where: { countrySlug, slug: citySlug } }),
    prisma.resource.findMany({
      where: { countrySlug, status: ResourceStatus.PUBLISHED },
      orderBy: { createdAt: 'asc' },
      include: { city: true },
    }),
    prisma.resource.findMany({
      where: { countrySlug: 'global', status: ResourceStatus.PUBLISHED },
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

  const cityByCategory = CATEGORY_ORDER.reduce(
    (acc, cat) => {
      acc[cat] = serializedCity.filter((r) => r.category === cat)
      return acc
    },
    {} as Record<ResourceCategory, typeof serializedCity>,
  )

  const globalByCategory = CATEGORY_ORDER.reduce(
    (acc, cat) => {
      acc[cat] = serializedGlobal.filter((r) => r.category === cat)
      return acc
    },
    {} as Record<ResourceCategory, typeof serializedGlobal>,
  )

  const hasGlobal = serializedGlobal.length > 0

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

      {/* Sección de la ciudad */}
      {CATEGORY_ORDER.map((category) => (
        <ActionCard
          key={category}
          category={category}
          resources={cityByCategory[category] ?? []}
          locale={locale as Locale}
        />
      ))}

      {/* Sección internacional */}
      {hasGlobal && (
        <>
          <div className="h-px bg-[rgba(20,20,20,0.12)]" />
          <div className="bg-[#f0f6f9] px-5 py-5">
            <div className="flex items-center gap-2 mb-0.5">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#184e68" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
              <span className="font-sans font-bold text-sm text-[#184e68] uppercase tracking-widest">
                {tSearch('international')}
              </span>
            </div>
            <p className="font-sans text-sm text-[#184e68]/60">
              {t('availableAnywhere')}
            </p>
          </div>
          {CATEGORY_ORDER.map((category) => (
            <ActionCard
              key={`global-${category}`}
              category={category}
              resources={globalByCategory[category] ?? []}
              locale={locale as Locale}
            />
          ))}
        </>
      )}

      <div className="h-px bg-[rgba(20,20,20,0.12)]" />

      <div className="px-5 flex justify-center">
        <ReportForm countrySlug={countrySlug} />
      </div>
    </main>
  )
}
