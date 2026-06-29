import Link from 'next/link'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { prisma } from '@/lib/prisma'
import { CountrySelector } from '@/components/CountrySelector'
import { ResourceStatus } from '@prisma/client'
import { Globe } from 'lucide-react'

export const revalidate = 3600

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)

  const t = await getTranslations('homepage')

  const [countries, globalCount] = await Promise.all([
    prisma.country.findMany({
      where: { active: true },
      orderBy: { slug: 'asc' },
      include: {
        _count: {
          select: { resources: { where: { status: ResourceStatus.PUBLISHED } } },
        },
      },
    }),
    prisma.resource.count({
      where: { countrySlug: 'global', status: ResourceStatus.PUBLISHED },
    }),
  ])

  const totalResources =
    countries.reduce((sum, c) => sum + c._count.resources, 0) + globalCount

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
      {/* Hero */}
      <div className="px-5 pt-5 pb-4 text-center">
        <h1 className="font-display font-extrabold text-[28px] leading-[1.15] tracking-[-0.01em] text-[#141414]">
          {t('heroPre')}{' '}
          <span className="inline-flex items-center gap-1.5 align-baseline">
            {t('heroCountry')}
            <img
              src="https://flagcdn.com/w40/ve.png"
              srcSet="https://flagcdn.com/w80/ve.png 2x"
              width={26}
              height={18}
              alt=""
              className="object-cover rounded-[2px] inline-block translate-y-[-1px]"
            />
          </span>
          <br />
          {t('heroPost')}
        </h1>
      </div>

      {/* Date band */}
      <div className="bg-coco h-9 flex items-center justify-center px-5">
        {formattedDate && (
          <p className="font-sans font-light text-[11px] text-[#808080] tracking-[0.02em]">
            {t('updatedAt', { date: formattedDate })}
          </p>
        )}
      </div>

      {/* Global resources row */}
      {globalCount > 0 && (
        <Link
          href={`/${locale}/global`}
          className="flex items-center justify-between h-14 px-5 bg-white border-b border-black/[0.08] hover:bg-guacamaya/5 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-[30px] h-[20px] flex items-center justify-center shrink-0">
              <Globe className="w-5 h-5 text-[#808080]" strokeWidth={1.5} />
            </div>
            <p className="font-sans font-semibold text-base text-[#141414] leading-tight">
              {t('globalSection')}
            </p>
          </div>
          <span className="text-guacamaya text-sm font-sans" aria-hidden="true">›</span>
        </Link>
      )}

      <CountrySelector countries={countries} locale={locale} />
    </main>
  )
}
