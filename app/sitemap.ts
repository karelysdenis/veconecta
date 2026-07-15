import type { MetadataRoute } from 'next'
import { prisma } from '@/lib/prisma'
import { ResourceStatus } from '@prisma/client'
import { SITE_URL, resourceCanonicalPath } from '@/lib/resource-detail'
import { getActiveLocales, getCountryLocaleMap } from '@/lib/locale-active'
import { effectiveLocalesForCountry, STATIC_PAGE_LOCALES, type Locale } from '@/lib/locale-content'
import { notPastEventFilter, MIN_CITY_RESOURCES } from '@/lib/resource-visibility'

export const revalidate = 3600

// Mirrors the same visibility rules the pages themselves enforce (active
// locales, per-country locale restriction, the city-page promotion
// threshold, past-event filtering) so the sitemap never lists a URL that
// would 404 or redirect.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [activeLocales, countryLocaleMap, countries, resources, citiesWithCount] = await Promise.all([
    getActiveLocales(),
    getCountryLocaleMap(),
    prisma.country.findMany({ where: { active: true } }),
    prisma.resource.findMany({
      where: { status: ResourceStatus.PUBLISHED, ...notPastEventFilter() },
      select: { slug: true, kind: true },
    }),
    prisma.city.findMany({
      include: {
        _count: { select: { resources: { where: { status: ResourceStatus.PUBLISHED, ...notPastEventFilter() } } } },
      },
    }),
  ])

  const activeCodes = activeLocales.map((l) => l.code) as Locale[]
  const promotedCitiesByCountry = new Map<string, string[]>()
  for (const city of citiesWithCount) {
    if (city._count.resources < MIN_CITY_RESOURCES) continue
    const list = promotedCitiesByCountry.get(city.countrySlug) ?? []
    list.push(city.slug)
    promotedCitiesByCountry.set(city.countrySlug, list)
  }

  const entries: MetadataRoute.Sitemap = []
  const add = (path: string, priority: number) =>
    entries.push({ url: `${SITE_URL}${path}`, lastModified: new Date(), priority })

  for (const locale of activeCodes) {
    add(`/${locale}`, 1)
    add(`/${locale}/buscar`, 0.5)
    add(`/${locale}/global`, 0.6)
    if ((STATIC_PAGE_LOCALES.sobre ?? activeCodes).includes(locale)) {
      add(`/${locale}/sobre`, 0.4)
    }

    for (const country of countries) {
      const effectiveLocales = effectiveLocalesForCountry(country.slug, activeCodes, countryLocaleMap)
      if (!effectiveLocales.includes(locale)) continue
      add(`/${locale}/${country.slug}`, 0.8)

      for (const citySlug of promotedCitiesByCountry.get(country.slug) ?? []) {
        add(`/${locale}/${country.slug}/${citySlug}`, 0.6)
      }
    }

    for (const resource of resources) {
      add(resourceCanonicalPath(resource, locale), 0.5)
    }
  }

  return entries
}
