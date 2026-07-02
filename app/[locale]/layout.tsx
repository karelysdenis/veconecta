import { NextIntlClientProvider } from 'next-intl'
import { getMessages, setRequestLocale } from 'next-intl/server'
import { getActiveLocales, getCountryLocaleMap } from '@/lib/locale-active'
import { AppHeader } from '@/components/AppHeader'
import { AppFooter } from '@/components/AppFooter'
import { BottomNav } from '@/components/BottomNav'
import { Analytics } from '@vercel/analytics/next'
import { SpeedInsights } from '@vercel/speed-insights/next'
import type { ReactNode } from 'react'

export async function generateStaticParams() {
  const active = await getActiveLocales()
  return active.map(({ code }) => ({ locale: code }))
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  const [messages, activeLocales, countryLocaleMap] = await Promise.all([
    getMessages(),
    getActiveLocales(),
    getCountryLocaleMap(),
  ])

  return (
    <NextIntlClientProvider messages={messages}>
      <AppHeader locale={locale} activeLocales={activeLocales} countryLocaleMap={countryLocaleMap} />
      <div className="pt-[68px]">
        <div className="max-w-2xl mx-auto">
          {children}
          <AppFooter />
        </div>
      </div>
      <div className="pb-20 md:pb-0" />
      <BottomNav locale={locale} />
      <Analytics />
      <SpeedInsights />
    </NextIntlClientProvider>
  )
}
