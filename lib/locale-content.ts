// Single source of truth for which locales VeConecta supports and how
// per-locale content columns (nameEn, namePt, notesFr...) map to a given
// locale. Adding a locale means: add the DB columns, add one entry to
// LOCALE_SUFFIX/LOCALE_LABELS below, add a messages/<locale>.json file — no
// call site that renders content needs to change. Slugs are NOT per-locale —
// every locale shares the same canonical `slug` id.
//
// LOCALES is the superset of locales with provisioned content columns — not
// the same as "currently live". Whether a provisioned locale is actually
// shown to visitors right now is a runtime toggle (the `Locale` DB table,
// admin-editable at /admin/languages) — see getActiveLocales() below. This
// lets an admin flip a locale on/off without a deploy, as long as it's
// already in this list.

export const LOCALES = ['es', 'en', 'pt', 'fr', 'de'] as const
export type Locale = (typeof LOCALES)[number]
export const DEFAULT_LOCALE: Locale = 'es'

export const LOCALE_LABELS: Record<Locale, string> = {
  es: 'Español',
  en: 'English',
  pt: 'Português',
  fr: 'Français',
  de: 'Deutsch',
}

// BCP-47 tags for Intl.DateTimeFormat / Intl.NumberFormat.
export const INTL_LOCALE: Record<Locale, string> = {
  es: 'es-ES',
  en: 'en-US',
  pt: 'pt-PT',
  fr: 'fr-FR',
  de: 'de-DE',
}

// Column suffix per locale: name + suffix = nameEn, namePt...
export const LOCALE_SUFFIX: Record<Locale, string> = {
  es: 'Es',
  en: 'En',
  pt: 'Pt',
  fr: 'Fr',
  de: 'De',
}

function field(record: object, base: string, locale: string): string | null {
  const key = `${base}${LOCALE_SUFFIX[locale as Locale] ?? LOCALE_SUFFIX.es}`
  const value = (record as Record<string, unknown>)[key]
  return typeof value === 'string' ? value : null
}

/**
 * Records where the Spanish value lives in the bare column (Resource.name)
 * and other locales live in `${base}${Suffix}` columns (nameEn, namePt...).
 */
export function localizeBare(record: object, base: string, locale: string): string {
  const es = (record as Record<string, unknown>)[base]
  const esValue = typeof es === 'string' ? es : ''
  if (locale === 'es') return esValue
  return field(record, base, locale) ?? esValue
}

/**
 * Records where the Spanish value also lives in its own `${base}Es` column
 * (Country/City names, Resource notes).
 */
export function localizeSuffixed(record: object, base: string, locale: string): string | null {
  const es = field(record, base, 'es')
  if (locale === 'es') return es
  return field(record, base, locale) ?? es
}

/**
 * Intersects a country's allowed locales (Country.enabledLocales) with the
 * site-wide active set. An empty `enabledLocales` means "no restriction" —
 * the country simply inherits every active locale.
 */
export function effectiveLocalesForCountry(
  countrySlug: string,
  activeCodes: readonly string[],
  countryMap: Record<string, string[]>,
): string[] {
  const restriction = countryMap[countrySlug]
  if (!restriction || restriction.length === 0) return [...activeCodes]
  return activeCodes.filter((code) => restriction.includes(code))
}
