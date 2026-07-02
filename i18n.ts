import { notFound } from 'next/navigation'
import { getRequestConfig } from 'next-intl/server'
import { LOCALES, DEFAULT_LOCALE, type Locale } from '@/lib/locale-content'
import { getActiveLocales } from '@/lib/locale-active'

// Superset of provisioned locales — still needed by proxy.ts, which builds
// its next-intl middleware once at module scope and can't do a per-request
// DB read there. Which of these are actually *live* right now is decided
// below, per-request, against the Locale DB table.
export const locales = LOCALES
export type { Locale }
export const defaultLocale: Locale = DEFAULT_LOCALE

export default getRequestConfig(async ({ requestLocale }) => {
  const locale = (await requestLocale) ?? defaultLocale
  const active = await getActiveLocales()
  if (!active.some((l) => l.code === locale)) notFound()
  return {
    locale,
    messages: (await import(`./messages/${locale}.json`)).default
  }
})
