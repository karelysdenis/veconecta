import { prisma } from '@/lib/prisma'
import { ResourceStatus } from '@prisma/client'

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
    select: { nameEs: true, nameEn: true, namePt: true, nameFr: true, nameDe: true, flag: true, cca2: true },
  },
} as const

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const q = (searchParams.get('q')?.trim() ?? '').slice(0, 100)

  if (q.length < 2) return Response.json({ results: [], fallback: [] })

  const matchingCountries = await prisma.country.findMany({
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
    },
  })
  const countrySlugs = matchingCountries.map(c => c.slug)

  const results = await prisma.resource.findMany({
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

  let fallback: typeof results = []
  if (results.length === 0) {
    fallback = await prisma.resource.findMany({
      where: { status: ResourceStatus.PUBLISHED, countrySlug: 'global' },
      select: RESOURCE_SELECT,
      orderBy: { createdAt: 'asc' },
      take: 50,
    })
  }

  return Response.json({ results, fallback, countries: matchingCountries })
}
