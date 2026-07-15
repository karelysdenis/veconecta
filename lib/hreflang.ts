import { SITE_URL } from '@/lib/resource-detail'
import type { Metadata } from 'next'

/**
 * Builds the `alternates.canonical`/`languages` block for a page, given the
 * locales it's actually reachable in and a function from locale to that
 * locale's path (e.g. `(l) => \`/${l}/${country.slug}\``). Centralizes the
 * pattern so every page declares hreflang the same way instead of each
 * page re-deriving its own `Object.fromEntries(...)`.
 */
export function buildAlternates(
  locale: string,
  locales: readonly string[],
  pathForLocale: (locale: string) => string,
): Metadata['alternates'] {
  return {
    canonical: `${SITE_URL}${pathForLocale(locale)}`,
    languages: Object.fromEntries(locales.map((l) => [l, `${SITE_URL}${pathForLocale(l)}`])),
  }
}
