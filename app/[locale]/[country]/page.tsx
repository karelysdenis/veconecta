import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { prisma } from '@/lib/prisma'
import { ActionCard } from '@/components/ActionCard'
import { CityList, type CityEntry } from '@/components/CityList'
import { serializeResource } from '@/lib/types'
import { flagUrl } from '@/lib/country-iso'
import { getLocalizedSlug } from '@/lib/country-slug'
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
  const { locale, country: urlSlug } = await params
  const whereLocalized = locale === 'en'
    ? { slugEn: urlSlug }
    : locale === 'pt'
      ? { slugPt: urlSlug }
      : { slugEs: urlSlug }

  const [country, t] = await Promise.all([
    prisma.country.findFirst({ where: { ...whereLocalized, active: true } }),
    getTranslations({ locale, namespace: 'country' }),
  ])
  if (!country) return {}

  const name = locale === 'en' ? country.nameEn : locale === 'pt' ? (country.namePt ?? country.nameEs) : country.nameEs
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
    alternates: {
      canonical: `https://www.veconecta.org/${locale}/${urlSlug}`,
      languages: {
        'es': `https://www.veconecta.org/es/${getLocalizedSlug(country, 'es')}`,
        'en': `https://www.veconecta.org/en/${getLocalizedSlug(country, 'en')}`,
        'pt': `https://www.veconecta.org/pt/${getLocalizedSlug(country, 'pt')}`,
      },
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

  const [t, tNav] = await Promise.all([
    getTranslations('country'),
    getTranslations('nav'),
  ])

  // Lookup by localized slug
  const whereLocalized = locale === 'en'
    ? { slugEn: urlSlug, active: true }
    : locale === 'pt'
      ? { slugPt: urlSlug, active: true }
      : { slugEs: urlSlug, active: true }

  let country = await prisma.country.findFirst({
    where: whereLocalized,
    include: {
      resources: {
        where: { status: ResourceStatus.PUBLISHED },
        orderBy: { createdAt: 'asc' },
      },
    },
  })

  // Fallback: try canonical slug and redirect to localized URL
  if (!country) {
    const byCanonical = await prisma.country.findUnique({ where: { slug: urlSlug, active: true } })
    if (byCanonical) {
      redirect(`/${locale}/${getLocalizedSlug(byCanonical, locale)}`)
    }
    notFound()
  }

  const slug = country.slug

  const [globalResources, citiesWithCount] = await Promise.all([
    prisma.resource.findMany({
      where: { countrySlug: 'global', status: ResourceStatus.PUBLISHED },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.city.findMany({
      where: { countrySlug: slug },
      include: {
        _count: {
          select: { resources: { where: { status: ResourceStatus.PUBLISHED } } },
        },
      },
    }),
  ])

  const name =
    locale === 'en'
      ? country.nameEn
      : locale === 'pt'
        ? (country.namePt ?? country.nameEs)
        : country.nameEs

  const realCities: CityEntry[] = citiesWithCount
    .filter((c) => c._count.resources > 0)
    .map((c) => ({
      name: locale === 'en' ? (c.nameEn ?? c.nameEs) : locale === 'pt' ? (c.namePt ?? c.nameEs) : c.nameEs,
      slug: c.slug,
      count: c._count.resources,
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

  const countryByCategory = CATEGORY_ORDER.reduce(
    (acc, cat) => {
      acc[cat] = serializedCountry.filter((r) => r.category === cat)
      return acc
    },
    {} as Record<ResourceCategory, typeof serializedCountry>,
  )

  const globalByCategory = CATEGORY_ORDER.reduce(
    (acc, cat) => {
      acc[cat] = serializedGlobal.filter((r) => r.category === cat)
      return acc
    },
    {} as Record<ResourceCategory, typeof serializedGlobal>,
  )

  const hasGlobal = serializedGlobal.length > 0

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

      {/* Sección del país */}
      {CATEGORY_ORDER.map((category) => (
        <ActionCard
          key={category}
          category={category}
          resources={countryByCategory[category] ?? []}
          locale={locale as 'es' | 'en' | 'pt'}
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
                {locale === 'en' ? 'International' : 'Internacional'}
              </span>
            </div>
            <p className="font-sans text-sm text-[#184e68]/60">
              {locale === 'en'
                ? 'Available from any country'
                : locale === 'pt'
                  ? 'Disponível de qualquer país'
                  : 'Disponible desde cualquier país'}
            </p>
          </div>
          {CATEGORY_ORDER.map((category) => (
            <ActionCard
              key={`global-${category}`}
              category={category}
              resources={globalByCategory[category] ?? []}
              locale={locale as 'es' | 'en' | 'pt'}
            />
          ))}
        </>
      )}

      <div className="h-px bg-[rgba(20,20,20,0.12)]" />
    </main>
  )
}
