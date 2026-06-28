import { NextIntlClientProvider } from 'next-intl'
import { getMessages, setRequestLocale } from 'next-intl/server'
import { locales } from '@/i18n'
import { AppHeader } from '@/components/AppHeader'
import { BottomNav } from '@/components/BottomNav'
import type { ReactNode } from 'react'
import '../globals.css'

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
    <html lang={locale}>
      <body className="bg-white text-gray-900 antialiased">
        <NextIntlClientProvider messages={messages}>
          <AppHeader locale={locale} />
          {/* pt-11: compensa header fijo 44px; pb-20 md:pb-0: compensa bottom nav móvil */}
          <div className="pt-11 pb-20 md:pb-0">
            {children}
          </div>
          <BottomNav locale={locale} />
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
