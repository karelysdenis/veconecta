import { NextIntlClientProvider } from 'next-intl'
import { getMessages, setRequestLocale } from 'next-intl/server'
import { locales } from '@/i18n'
import { AppHeader } from '@/components/AppHeader'
import { AppFooter } from '@/components/AppFooter'
import { BottomNav } from '@/components/BottomNav'
import { Analytics } from '@vercel/analytics/next'
import { SpeedInsights } from '@vercel/speed-insights/next'
import type { ReactNode } from 'react'

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }))
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
  const messages = await getMessages()

  return (
    <NextIntlClientProvider messages={messages}>
      <AppHeader locale={locale} />
      <div className="pt-14">
        <div className="max-w-xl mx-auto">
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
