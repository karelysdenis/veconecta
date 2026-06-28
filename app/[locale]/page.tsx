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

  return (
    <main className="min-h-screen">
      {/* Emergency banner */}
      <div className="bg-emergencia text-white py-2.5 px-4 text-center text-sm font-semibold flex items-center justify-center gap-2">
        <span aria-hidden="true">⚠️</span>
        {t('emergencyBanner')}
      </div>

      <div className="max-w-lg mx-auto px-4 pt-10 pb-6">
        {/* Hero */}
        <h1 className="font-display font-extrabold text-4xl text-selva leading-[1.1] mb-3">
          {t('heroTitle')}
        </h1>
        {totalResources > 0 && (
          <p className="text-sm text-guacamaya font-semibold mb-8">
            {t('verifiedResources', { count: totalResources })}
          </p>
        )}

        {/* Country list */}
        <CountrySelector countries={countries} locale={locale} />
      </div>
    </main>
  )
}
