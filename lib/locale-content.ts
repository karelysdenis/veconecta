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

/** "8–9 jul" for a multi-day event, "5 jul" when start/end are the same day or only one is set. */
export function formatEventRange(
  startIso: string | null,
  endIso: string | null,
  locale: Locale,
): string | null {
  if (!startIso && !endIso) return null
  const fmt = new Intl.DateTimeFormat(INTL_LOCALE[locale], { day: 'numeric', month: 'short' })
  const start = startIso ? new Date(startIso) : null
  const end = endIso ? new Date(endIso) : null
  if (start && end && start.getTime() !== end.getTime()) {
    return `${fmt.format(start)} – ${fmt.format(end)}`
  }
  return fmt.format((end ?? start) as Date)
}

// Column suffix per locale: name + suffix = nameEn, namePt...
export const LOCALE_SUFFIX: Record<Locale, string> = {
  es: 'Es',
  en: 'En',
  pt: 'Pt',
  fr: 'Fr',
  de: 'De',
}

/**
 * Reads `${base}${suffix}` (nameEn, notesDe, ...) for every non-'es' locale
 * from a resource/country admin form submission — trimmed, empty → null.
 * Adding a locale to LOCALES makes it read here automatically; no per-field
 * lines to keep in sync (that drift is what silently dropped fr/de resource
 * translations before).
 */
export function localizedFieldsFromForm(fd: FormData, base: string): Record<string, string | null> {
  const out: Record<string, string | null> = {}
  for (const l of LOCALES) {
    if (l === 'es') continue
    const key = `${base}${LOCALE_SUFFIX[l]}`
    const raw = fd.get(key)
    out[key] = typeof raw === 'string' ? (raw.trim() || null) : null
  }
  return out
}

/** Builds the {en, pt, fr, de, ...} defaultValues object NameTabs/LanguageTabs expect from a stored record. */
export function localizedDefaultValues(
  record: Record<string, unknown>,
  base: string,
): Partial<Record<Locale, string>> {
  const out: Partial<Record<Locale, string>> = {}
  for (const l of LOCALES) {
    if (l === 'es') continue
    const val = record[`${base}${LOCALE_SUFFIX[l]}`]
    out[l] = typeof val === 'string' ? val : ''
  }
  return out
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
 * Whether a country should be listed/linked at all when browsing in
 * `locale` — same "empty enabledLocales = no restriction" rule as
 * effectiveLocalesForCountry, but for the common case where you already
 * have the single country row in hand (selector lists, search results)
 * and don't need the full active-set intersection.
 */
export function isCountryVisibleInLocale(enabledLocales: readonly string[], locale: string): boolean {
  return enabledLocales.length === 0 || enabledLocales.includes(locale)
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
