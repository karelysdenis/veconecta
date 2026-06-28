import { getTranslations, setRequestLocale } from 'next-intl/server'
import { prisma } from '@/lib/prisma'
import { CountrySelector } from '@/components/CountrySelector'
import { ResourceStatus } from '@prisma/client'

export const revalidate = 3600

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)

  const t = await getTranslations('homepage')
  const countries = await prisma.country.findMany({
    where: { active: true },
    orderBy: { slug: 'asc' },
    include: {
      _count: {
        select: { resources: { where: { status: ResourceStatus.PUBLISHED } } },
      },
    },
  })

  const totalResources = countries.reduce((sum, c) => sum + c._count.resources, 0)

  const latestDate = countries
    .map((c) => c.lastUpdatedAt)
    .filter(Boolean)
    .sort()
    .at(-1)

  const formattedDate = latestDate
    ? new Intl.DateTimeFormat(locale === 'en' ? 'en-US' : 'es-ES', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }).format(latestDate)
    : null

  return (
    <main className="min-h-screen bg-white">
      {/* Emergency banner */}
      <div className="bg-emergencia text-white py-2.5 px-5 text-center text-sm font-semibold flex items-center justify-center gap-2">
        <span aria-hidden="true">⚠️</span>
        {t('emergencyBanner')}
      </div>

      {/* Hero */}
      <div className="px-5 pt-5 pb-4">
        <h1 className="font-display font-extrabold text-[28px] leading-[1.15] tracking-[-0.01em] text-[#141414]">
          {t('heroTitle')}
        </h1>
        <p className="font-sans font-light text-base text-[#808080] mt-2">
          {t('selectCountry')}
        </p>
      </div>

      {/* Resource count */}
      {totalResources > 0 && (
        <div className="flex items-center gap-2 h-11 px-5">
          <span className="w-1.5 h-1.5 rounded-full bg-guacamaya shrink-0" aria-hidden="true" />
          <span className="font-sans font-semibold text-sm text-caribe">
            {t('verifiedResources', { count: totalResources })}
          </span>
          {formattedDate && (
            <>
              <span className="text-[#b8b8b8] text-sm" aria-hidden="true">·</span>
              <span className="font-sans text-sm text-[#808080]">
                {t('updatedAt', { date: formattedDate })}
              </span>
            </>
          )}
        </div>
      )}

      {/* Section label */}
      <div className="bg-coco h-9 flex items-center px-5">
        <p className="font-sans font-light text-[11px] text-[#808080] tracking-[0.02em] uppercase">
          {t('sectionLabel')}
        </p>
      </div>

      <CountrySelector countries={countries} locale={locale} />
    </main>
  )
}
