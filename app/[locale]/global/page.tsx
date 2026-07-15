import Link from 'next/link'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { prisma } from '@/lib/prisma'
import { ActionCard } from '@/components/ActionCard'
import { serializeResource } from '@/lib/types'
import { notPastEventFilter } from '@/lib/resource-visibility'
import type { Locale } from '@/lib/locale-content'
import { getActiveLocales } from '@/lib/locale-active'
import { buildAlternates } from '@/lib/hreflang'
import { ResourceCategory, ResourceStatus } from '@prisma/client'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'

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
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const isEn = locale === 'en'
  const [tHomepage, activeLocales] = await Promise.all([
    getTranslations({ locale, namespace: 'homepage' }),
    getActiveLocales(),
  ])
  return {
    title: `${tHomepage('globalSection')} | VEconecta`,
    description: isEn
      ? 'Verified initiatives for Venezuelans available from any country of residence.'
      : 'Iniciativas verificadas para venezolanos disponibles desde cualquier país de residencia.',
    openGraph: {
      type: 'website',
      siteName: 'VEconecta',
      images: [{ url: `/api/og?locale=${locale}`, width: 1200, height: 630 }],
    },
    alternates: buildAlternates(
      locale,
      activeLocales.map((l) => l.code),
      (l) => `/${l}/global`,
    ),
  }
}

export default async function GlobalPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)

  const [tNav, tHomepage] = await Promise.all([
    getTranslations('nav'),
    getTranslations('homepage'),
  ])

  const raw = await prisma.resource.findMany({
    where: { countrySlug: 'global', status: ResourceStatus.PUBLISHED, ...notPastEventFilter() },
    orderBy: { createdAt: 'asc' },
    include: { city: true },
  })

  const resources = raw.map(serializeResource)

  const byCategory = CATEGORY_ORDER.reduce(
    (acc, cat) => {
      acc[cat] = resources.filter((r) => r.category === cat)
      return acc
    },
    {} as Record<ResourceCategory, typeof resources>,
  )

  return (
    <main className="min-h-screen bg-white">
      <div className="bg-coco h-10 flex items-center px-5 gap-1.5">
        <Link
          href={`/${locale}`}
          className="font-sans font-normal text-sm text-caribe hover:underline"
        >
          {tNav('home')}
        </Link>
        <span className="font-sans text-sm text-[#b8b8b8]">›</span>
        <span className="font-sans font-normal text-sm text-[#141414]">
          {tHomepage('globalSection')}
        </span>
      </div>

      <div className="px-5 pt-5 pb-4">
        <h1 className="font-display font-extrabold text-[28px] leading-[1.1] tracking-[-0.01em] text-[#141414]">
          {tHomepage('globalSection')}
        </h1>
      </div>

      {CATEGORY_ORDER.map((cat) => (
        <ActionCard
          key={cat}
          category={cat}
          resources={byCategory[cat] ?? []}
          locale={locale as Locale}
        />
      ))}
      <div className="h-px bg-[rgba(20,20,20,0.12)]" />
    </main>
  )
}
