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
// threshold, past-event filtering) so the sitemap never advertises a
// locale/country/resource combination the site itself doesn't consider valid.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [activeLocales, countryLocaleMap, countries, resources, citiesWithCount] = await Promise.all([
    getActiveLocales(),
    getCountryLocaleMap(),
    prisma.country.findMany({ where: { active: true } }),
    prisma.resource.findMany({
      where: { status: ResourceStatus.PUBLISHED, ...notPastEventFilter() },
      select: { slug: true, kind: true, countrySlug: true },
    }),
    prisma.city.findMany({
      where: { country: { active: true } },
      select: {
        slug: true,
        countrySlug: true,
        _count: { select: { resources: { where: { status: ResourceStatus.PUBLISHED, ...notPastEventFilter() } } } },
      },
    }),
  ])

  const activeCodes = activeLocales.map((l) => l.code) as Locale[]

  // Computed once per country rather than once per locale×country — the
  // result never depends on which locale is currently being iterated below.
  // Also used for a resource's own countrySlug: an unrestricted/virtual
  // country like 'global' (excluded from `countries` since it's inactive)
  // falls back to every active locale, matching the /global page itself.
  const effectiveLocalesByCountry = new Map<string, string[]>(
    countries.map((c) => [c.slug, effectiveLocalesForCountry(c.slug, activeCodes, countryLocaleMap)]),
  )

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
      const effectiveLocales = effectiveLocalesByCountry.get(country.slug) ?? activeCodes
      if (!effectiveLocales.includes(locale)) continue
      add(`/${locale}/${country.slug}`, 0.8)

      for (const citySlug of promotedCitiesByCountry.get(country.slug) ?? []) {
        add(`/${locale}/${country.slug}/${citySlug}`, 0.6)
      }
    }

    for (const resource of resources) {
      const effectiveLocales = effectiveLocalesByCountry.get(resource.countrySlug) ?? activeCodes
      if (!effectiveLocales.includes(locale)) continue
      add(resourceCanonicalPath(resource, locale), 0.5)
    }
  }

  return entries
}
