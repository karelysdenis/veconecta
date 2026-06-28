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
  const country = await prisma.country.findUnique({ where: { slug } })
  if (!country) return {}

  const name = locale === 'en' ? country.nameEn : country.nameEs
  const isEn = locale === 'en'

  return {
    title: isEn
      ? `From ${name}: How to help with the Venezuela earthquake | VeConecta`
      : `Desde ${name}: Cómo ayudar con el terremoto de Venezuela | VeConecta`,
    description: isEn
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
    <main className="min-h-screen bg-white">
      <div className="bg-red-700 text-white py-3 px-4 text-center text-sm font-medium">
        VeConecta {country.flag} {name}
      </div>
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-xl font-bold text-gray-900">
            {locale === 'en' ? `From ${name}` : `Desde ${name}`}
          </h1>
          {lastUpdated && (
            <span className="text-xs text-gray-500">
              {t('lastUpdated', { date: lastUpdated })}
            </span>
          )}
        </div>
        <p className="text-gray-600 text-sm mb-6">
          {locale === 'en'
            ? "Here's what you can do right now:"
            : 'Esto es lo que puedes hacer ahora mismo:'}
        </p>

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

        <div className="mt-8 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <p className="text-xs text-gray-500">{tDisclaimer('disclaimer')}</p>
        </div>

        <ReportForm countrySlug={slug} />
      </div>
    </main>
  )
}
