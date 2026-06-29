type SlugFields = {
  slug: string
  slugEs?: string | null
  slugEn?: string | null
  slugPt?: string | null
}

export function getLocalizedSlug(country: SlugFields, locale: string): string {
  if (locale === 'en') return country.slugEn ?? country.slug
  if (locale === 'pt') return country.slugPt ?? country.slugEs ?? country.slug
  return country.slugEs ?? country.slug
}
