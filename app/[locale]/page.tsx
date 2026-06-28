import { getTranslations, setRequestLocale } from 'next-intl/server'
import { prisma } from '@/lib/prisma'
import { CountrySelector } from '@/components/CountrySelector'

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
  })

  return (
    <main className="min-h-screen bg-white">
      <div className="bg-red-700 text-white py-3 px-4 text-center text-sm font-medium">
        {t('emergencyBanner')}
      </div>
      <div className="max-w-2xl mx-auto px-4 py-10">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">{t('title')}</h1>
        <p className="text-gray-600 mb-8">{t('subtitle')}</p>
        <CountrySelector countries={countries} locale={locale} />
      </div>
    </main>
  )
}
