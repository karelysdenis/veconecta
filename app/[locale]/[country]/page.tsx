import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { prisma } from '@/lib/prisma'
import { ActionCard } from '@/components/ActionCard'
import { CityList, type CityEntry } from '@/components/CityList'
import { serializeResource } from '@/lib/types'
import { flagUrl } from '@/lib/country-iso'
import { cityToSlug, isVirtualCity } from '@/lib/slugify'
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
  params: Promise<{ locale: string; country: string }>
}): Promise<Metadata> {
  const { locale, country: slug } = await params
  const [country, t] = await Promise.all([
    prisma.country.findUnique({ where: { slug } }),
    getTranslations({ locale, namespace: 'country' }),
  ])
  if (!country) return {}

  const name = locale === 'en' ? country.nameEn : country.nameEs
  const heading = t('fromCountry', { name })

  return {
    title: `${heading}: ${locale === 'en' ? 'How to help with the Venezuela earthquake' : 'Cómo ayudar con el terremoto de Venezuela'} | VeConecta`,
    description:
      locale === 'en'
        ? `Verified donation channels, free calls, and how to find missing family from ${name}. Updated resources for Venezuelans.`
        : `Recursos verificados para venezolanos en ${name}: donaciones, llamadas gratis, búsqueda de familiares.`,
    openGraph: {
      type: 'website',
      siteName: 'VeConecta',
      images: [{ url: '/api/og', width: 1200, height: 630 }],
    },
  }
}

export default async function CountryPage({
  params,
}: {
  params: Promise<{ locale: string; country: string }>
}) {
  const { locale, country: slug } = await params
  setRequestLocale(locale)

  const [t, tNav] = await Promise.all([
    getTranslations('country'),
    getTranslations('nav'),
  ])

  const [country, globalResources, cityGroups] = await Promise.all([
    prisma.country.findUnique({
      where: { slug, active: true },
      include: {
        resources: {
          where: { status: ResourceStatus.PUBLISHED },
          orderBy: { createdAt: 'asc' },
        },
      },
    }),
    prisma.resource.findMany({
      where: { countrySlug: 'global', status: ResourceStatus.PUBLISHED },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.resource.groupBy({
      by: ['city'],
      where: {
        countrySlug: slug,
        status: ResourceStatus.PUBLISHED,
        city: { not: null },
      },
      _count: { _all: true },
    }),
  ])

  if (!country) notFound()

  const name =
    locale === 'en'
      ? country.nameEn
      : locale === 'pt'
        ? (country.namePt ?? country.nameEs)
        : country.nameEs

  // Build city list — filter out virtual cities (Nacional, etc.)
  const realCities: CityEntry[] = cityGroups
    .filter((g) => g.city && !isVirtualCity(g.city))
    .map((g) => ({
      name: g.city!,
      slug: cityToSlug(g.city!),
      count: g._count._all,
    }))
    .sort((a, b) => b.count - a.count)

  const hasCitySelector = realCities.length >= 2

  const flag40 = flagUrl(slug, 'w40')
  const flag80 = flagUrl(slug, 'w80')

  const lastUpdated = country.lastUpdatedAt
    ? new Intl.DateTimeFormat(locale === 'en' ? 'en-US' : 'es-ES', {
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
              {name}
            </h1>
          </div>
        </div>

        <CityList cities={realCities} countrySlug={slug} locale={locale} />
      </main>
    )
  }

  // No city selector: show all resources directly
  const serializedResources = [...country.resources, ...globalResources].map(serializeResource)

  const resourcesByCategory = CATEGORY_ORDER.reduce(
    (acc, cat) => {
      acc[cat] = serializedResources.filter((r) => r.category === cat)
      return acc
    },
    {} as Record<ResourceCategory, typeof serializedResources>,
  )

  const totalResources = serializedResources.length

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
            {name}
          </h1>
        </div>
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
    </main>
  )
}
