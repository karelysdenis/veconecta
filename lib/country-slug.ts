import { localizeSuffixed } from './locale-content'

type SlugFields = {
  slug: string
}

export function getLocalizedSlug(country: SlugFields, locale: string): string {
  return localizeSuffixed(country, 'slug', locale) ?? country.slug
}
