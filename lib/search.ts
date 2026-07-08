import { prisma } from '@/lib/prisma'
import { ResourceStatus } from '@prisma/client'
import { isCountryVisibleInLocale } from '@/lib/locale-content'
import { notPastEventFilter } from '@/lib/resource-visibility'
import { rankSearchResults } from '@/lib/search-rank'

const RESOURCE_SELECT = {
  id: true,
  name: true,
  nameEn: true,
  namePt: true,
  nameFr: true,
  nameDe: true,
  category: true,
  countrySlug: true,
  kind: true,
  eventStartsAt: true,
  eventEndsAt: true,
  notesEs: true,
  notesEn: true,
  notesPt: true,
  notesFr: true,
  notesDe: true,
  url: true,
  country: {
    select: {
      nameEs: true, nameEn: true, namePt: true, nameFr: true, nameDe: true, flag: true, cca2: true,
      enabledLocales: true,
    },
  },
  city: {
    select: { slug: true, nameEs: true, nameEn: true, namePt: true, nameFr: true, nameDe: true },
  },
} as const

async function findMatchingCountries(query: string, locale: string) {
  const countries = await prisma.country.findMany({
    where: {
      active: true,
      OR: [
        { nameEs: { contains: query, mode: 'insensitive' } },
        { nameEn: { contains: query, mode: 'insensitive' } },
        { namePt: { contains: query, mode: 'insensitive' } },
        { nameFr: { contains: query, mode: 'insensitive' } },
        { nameDe: { contains: query, mode: 'insensitive' } },
      ],
    },
    select: {
      slug: true,
      nameEs: true, nameEn: true, namePt: true, nameFr: true, nameDe: true, cca2: true,
      enabledLocales: true,
    },
  })
  return countries.filter((c) => isCountryVisibleInLocale(c.enabledLocales, locale))
}

async function findMatchingResources(query: string, countrySlugs: string[]) {
  return prisma.resource.findMany({
    where: {
      status: ResourceStatus.PUBLISHED,
      AND: [
        notPastEventFilter(),
        {
          OR: [
            { name: { contains: query, mode: 'insensitive' } },
            { nameEn: { contains: query, mode: 'insensitive' } },
            { namePt: { contains: query, mode: 'insensitive' } },
            { nameFr: { contains: query, mode: 'insensitive' } },
            { nameDe: { contains: query, mode: 'insensitive' } },
            { notesEs: { contains: query, mode: 'insensitive' } },
            { notesEn: { contains: query, mode: 'insensitive' } },
            { notesPt: { contains: query, mode: 'insensitive' } },
            { notesFr: { contains: query, mode: 'insensitive' } },
            { notesDe: { contains: query, mode: 'insensitive' } },
            ...(countrySlugs.length > 0 ? [{ countrySlug: { in: countrySlugs } }] : []),
          ],
        },
      ],
    },
    select: RESOURCE_SELECT,
    orderBy: { createdAt: 'asc' },
    take: 100,
  })
}

/**
 * Single source of truth for resource search: query + relevance ranking +
 * the "no results → show global resources instead" fallback. Used by both
 * `/api/search` (the header's quick-search overlay) and `/buscar` (the full
 * search page) so a future change to ranking or filtering only has to
 * happen once.
 */
export async function searchResources({ query, locale }: { query: string; locale: string }) {
  if (query.length < 2) {
    return { results: [], fallback: [], countries: [] }
  }

  const matchingCountries = await findMatchingCountries(query, locale)
  const countrySlugs = matchingCountries.map((c) => c.slug)

  const rawResults = await findMatchingResources(query, countrySlugs)
  // A resource whose country page 404s in this locale shouldn't surface in
  // search either — it would be a dead end with no way back to its country.
  const visibleResults = rawResults.filter((r) => isCountryVisibleInLocale(r.country.enabledLocales, locale))
  const results = rankSearchResults(visibleResults, query, locale)

  let fallback: typeof results = []
  if (results.length === 0) {
    const rawFallback = await prisma.resource.findMany({
      where: { status: ResourceStatus.PUBLISHED, countrySlug: 'global', ...notPastEventFilter() },
      select: RESOURCE_SELECT,
      orderBy: { createdAt: 'asc' },
      take: 50,
    })
    const visibleFallback = rawFallback.filter((r) => isCountryVisibleInLocale(r.country.enabledLocales, locale))
    fallback = rankSearchResults(visibleFallback, query, locale)
  }

  return { results, fallback, countries: matchingCountries }
}
