import { notFound } from 'next/navigation'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { prisma } from '@/lib/prisma'
import { ActionCard } from '@/components/ActionCard'
import { ReportForm } from '@/components/ReportForm'
import { serializeResource } from '@/lib/types'
import { flagUrl } from '@/lib/country-iso'
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

  const t = await getTranslations('country')
  const tDisclaimer = await getTranslations()

  const country = await prisma.country.findUnique({
    where: { slug, active: true },
    include: {
      resources: {
        where: { status: ResourceStatus.PUBLISHED },
        orderBy: { createdAt: 'asc' },
      },
    },
  })

  if (!country) notFound()

  const name =
    locale === 'en'
      ? country.nameEn
      : locale === 'pt'
        ? (country.namePt ?? country.nameEs)
        : country.nameEs

  const serializedResources = country.resources.map(serializeResource)

  const resourcesByCategory = CATEGORY_ORDER.reduce(
    (acc, cat) => {
      acc[cat] = serializedResources.filter((r) => r.category === cat)
      return acc
    },
    {} as Record<ResourceCategory, typeof serializedResources>,
  )

  const lastUpdated = country.lastUpdatedAt
    ? new Intl.DateTimeFormat(locale === 'en' ? 'en-US' : 'es-ES', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }).format(country.lastUpdatedAt)
    : null

  const flag40 = flagUrl(slug, 'w40')
  const flag80 = flagUrl(slug, 'w80')

  return (
    <main className="min-h-screen bg-white">
      {/* Country header */}
      <div className="px-5 pt-5 pb-4">
        <div className="flex items-center gap-3 mb-2">
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
          <h1 className="font-display font-extrabold text-[28px] leading-[1.15] tracking-[-0.01em] text-[#141414]">
            {t('fromCountry', { name })}
          </h1>
        </div>
        {lastUpdated && (
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-guacamaya shrink-0" aria-hidden="true" />
            <p className="font-sans font-light text-sm text-[#808080]">
              {t('lastUpdated', { date: lastUpdated })}
            </p>
          </div>
        )}
      </div>

      {/* Section label */}
      <div className="bg-coco h-9 flex items-center px-5">
        <p className="font-sans font-light text-[11px] text-[#808080] tracking-[0.02em] uppercase">
          {t('whatYouCanDo')}
        </p>
      </div>

      {/* Resource categories */}
      <div className="px-5 pt-4 pb-6 space-y-2">
        {CATEGORY_ORDER.map((category) => (
          <ActionCard
            key={category}
            category={category}
            resources={resourcesByCategory[category] ?? []}
            locale={locale as 'es' | 'en' | 'pt'}
          />
        ))}
      </div>

      {/* Disclaimer */}
      <div className="px-5 pb-6 border-t border-black/[0.08] pt-4">
        <p className="font-sans font-light text-xs text-[#808080]">{tDisclaimer('disclaimer')}</p>
      </div>

      <ReportForm countrySlug={slug} />
    </main>
  )
}
