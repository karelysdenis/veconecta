import { notFound } from 'next/navigation'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { prisma } from '@/lib/prisma'
import { ActionCard } from '@/components/ActionCard'
import { ReportForm } from '@/components/ReportForm'
import { serializeResource } from '@/lib/types'
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

  // Serialize dates before passing to Client Components
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
        month: 'long',
      }).format(country.lastUpdatedAt)
    : null

  return (
    <main className="min-h-screen">
      <div className="max-w-lg mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="font-display font-extrabold text-2xl text-selva flex items-center gap-2 mb-1">
            <img
              src={`https://flagcdn.com/${slug}.svg`}
              width={28}
              height={21}
              alt=""
              className="rounded-sm object-cover"
            />
            {t('fromCountry', { name })}
          </h1>
          {lastUpdated && (
            <p className="text-xs text-guacamaya font-semibold">
              {t('lastUpdated', { date: lastUpdated })}
            </p>
          )}
        </div>

        <div className="space-y-2">
          {CATEGORY_ORDER.map((category) => (
            <ActionCard
              key={category}
              category={category}
              resources={resourcesByCategory[category] ?? []}
              locale={locale as 'es' | 'en' | 'pt'}
            />
          ))}
        </div>

        <div className="mt-8 p-4 bg-white/60 rounded-lg border border-gray-200">
          <p className="text-xs text-gray-500">{tDisclaimer('disclaimer')}</p>
        </div>

        <ReportForm countrySlug={slug} />
      </div>
    </main>
  )
}
