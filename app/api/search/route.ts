import { prisma } from '@/lib/prisma'
import { ResourceStatus } from '@prisma/client'
import { isCountryVisibleInLocale } from '@/lib/locale-content'

const RESOURCE_SELECT = {
  id: true,
  name: true,
  nameEn: true,
  namePt: true,
  nameFr: true,
  nameDe: true,
  category: true,
  countrySlug: true,
  notesEs: true,
  notesEn: true,
  notesPt: true,
  notesFr: true,
  notesDe: true,
  country: {
    select: {
      nameEs: true, nameEn: true, namePt: true, nameFr: true, nameDe: true, flag: true, cca2: true,
      enabledLocales: true,
    },
  },
} as const

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const q = (searchParams.get('q')?.trim() ?? '').slice(0, 100)
  const locale = searchParams.get('locale') ?? 'es'

  if (q.length < 2) return Response.json({ results: [], fallback: [] })

  const matchingCountries = (await prisma.country.findMany({
    where: {
      active: true,
      OR: [
        { nameEs: { contains: q, mode: 'insensitive' } },
        { nameEn: { contains: q, mode: 'insensitive' } },
        { namePt: { contains: q, mode: 'insensitive' } },
        { nameFr: { contains: q, mode: 'insensitive' } },
        { nameDe: { contains: q, mode: 'insensitive' } },
      ],
    },
    select: {
      slug: true,
      nameEs: true, nameEn: true, namePt: true, nameFr: true, nameDe: true, cca2: true,
      enabledLocales: true,
    },
  })).filter((c) => isCountryVisibleInLocale(c.enabledLocales, locale))
  const countrySlugs = matchingCountries.map(c => c.slug)

  const rawResults = await prisma.resource.findMany({
    where: {
      status: ResourceStatus.PUBLISHED,
      OR: [
        { name: { contains: q, mode: 'insensitive' } },
        { nameEn: { contains: q, mode: 'insensitive' } },
        { namePt: { contains: q, mode: 'insensitive' } },
        { nameFr: { contains: q, mode: 'insensitive' } },
        { nameDe: { contains: q, mode: 'insensitive' } },
        { notesEs: { contains: q, mode: 'insensitive' } },
        { notesEn: { contains: q, mode: 'insensitive' } },
        { notesPt: { contains: q, mode: 'insensitive' } },
        { notesFr: { contains: q, mode: 'insensitive' } },
        { notesDe: { contains: q, mode: 'insensitive' } },
        ...(countrySlugs.length > 0 ? [{ countrySlug: { in: countrySlugs } }] : []),
      ],
    },
    select: RESOURCE_SELECT,
    orderBy: { createdAt: 'asc' },
    take: 100,
  })
  // A resource whose country page 404s in this locale shouldn't surface in
  // search either — it would be a dead end with no way back to its country.
  const results = rawResults.filter((r) => isCountryVisibleInLocale(r.country.enabledLocales, locale))

  let fallback: typeof results = []
  if (results.length === 0) {
    fallback = (await prisma.resource.findMany({
      where: { status: ResourceStatus.PUBLISHED, countrySlug: 'global' },
      select: RESOURCE_SELECT,
      orderBy: { createdAt: 'asc' },
      take: 50,
    })).filter((r) => isCountryVisibleInLocale(r.country.enabledLocales, locale))
  }

  return Response.json({ results, fallback, countries: matchingCountries })
}
