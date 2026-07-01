import { LOCALE_SUFFIX, type Locale } from './locale-content'

type SlugFields = {
  slug: string
} & Record<string, unknown>

// Falls back to the canonical `slug` id (never null) rather than cascading
// through the Spanish slug column like content fields do — the page lookup's
// own fallback only recognizes the canonical id, so links must match that.
export function getLocalizedSlug(country: SlugFields, locale: string): string {
  const suffix = LOCALE_SUFFIX[locale as Locale] ?? LOCALE_SUFFIX.es
  const value = country[`slug${suffix}`]
  return typeof value === 'string' && value.length > 0 ? value : country.slug
}
