// Single source of truth for which locales VeConecta supports and how
// per-locale content columns (nameEn, namePt, notesFr, slugDe...) map to a
// given locale. Adding a locale means: add the DB columns, add one entry to
// LOCALE_SUFFIX/LOCALE_LABELS below, add a messages/<locale>.json file — no
// call site that renders content needs to change.

export const LOCALES = ['es', 'en', 'pt'] as const
export type Locale = (typeof LOCALES)[number]
export const DEFAULT_LOCALE: Locale = 'es'

export const LOCALE_LABELS: Record<Locale, string> = {
  es: 'Español',
  en: 'English',
  pt: 'Português',
}

// BCP-47 tags for Intl.DateTimeFormat / Intl.NumberFormat.
export const INTL_LOCALE: Record<Locale, string> = {
  es: 'es-ES',
  en: 'en-US',
  pt: 'pt-PT',
}

// Column suffix per locale: name + suffix = nameEn, namePt...
export const LOCALE_SUFFIX: Record<Locale, string> = {
  es: 'Es',
  en: 'En',
  pt: 'Pt',
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
 * (Country/City names, Resource notes, slugs).
 */
export function localizeSuffixed(record: object, base: string, locale: string): string | null {
  const es = field(record, base, 'es')
  if (locale === 'es') return es
  return field(record, base, locale) ?? es
}

/** Builds a Prisma `where` filter for a locale-suffixed unique slug column (slugEs, slugEn, slugFr...). */
export function localizedSlugWhere(urlSlug: string, locale: string): Record<string, string> {
  const suffix = LOCALE_SUFFIX[locale as Locale] ?? LOCALE_SUFFIX.es
  return { [`slug${suffix}`]: urlSlug }
}
