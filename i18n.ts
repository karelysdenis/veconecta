import { notFound } from 'next/navigation'
import { getRequestConfig } from 'next-intl/server'

export const locales = ['es', 'en'] as const
export type Locale = typeof locales[number]
export const defaultLocale: Locale = 'es'

export default getRequestConfig(async ({ requestLocale }) => {
  const locale = (await requestLocale) ?? defaultLocale
  if (!locales.includes(locale as Locale)) notFound()
  return {
    locale,
    messages: (await import(`./messages/${locale}.json`)).default
  }
})
