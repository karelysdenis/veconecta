import { notFound } from 'next/navigation'
import { getRequestConfig } from 'next-intl/server'
import { LOCALES, DEFAULT_LOCALE, type Locale } from '@/lib/locale-content'

export const locales = LOCALES
export type { Locale }
export const defaultLocale: Locale = DEFAULT_LOCALE

export default getRequestConfig(async ({ requestLocale }) => {
  const locale = (await requestLocale) ?? defaultLocale
  if (!locales.includes(locale as Locale)) notFound()
  return {
    locale,
    messages: (await import(`./messages/${locale}.json`)).default
  }
})
