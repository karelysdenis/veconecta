function normalize(s: string): string {
  return s.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
}

export const COUNTRY_ALIASES: Record<string, string> = {
  eeuu: 'usa',
  'ee.uu.': 'usa',
  usa: 'usa',
  'estados unidos': 'usa',
  'united states': 'usa',
  brazil: 'brazil',
}

export function resolveCountrySlug(
  raw: string,
  countries: { slug: string; nameEs: string }[],
): string | null {
  const key = normalize(raw)
  if (COUNTRY_ALIASES[key]) return COUNTRY_ALIASES[key]
  const match = countries.find((c) => normalize(c.nameEs) === key)
  return match ? match.slug : null
}
