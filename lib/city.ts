import { prisma } from '@/lib/prisma'
import { slugify } from '@/lib/slugify'
import type { Prisma, PrismaClient } from '@prisma/client'

type PrismaClientOrTx = PrismaClient | Prisma.TransactionClient

/**
 * Creates a City by name, reusing an existing one on slug collision — two
 * editors (or two rows of a bulk import) independently adding "the same
 * city" concurrently should land on one row, not two. Accepts an explicit
 * client so callers running inside a `prisma.$transaction` can pass their
 * transaction handle instead of writing outside it.
 */
export async function resolveOrCreateCityByName(
  countrySlug: string,
  nameEs: string,
  client: PrismaClientOrTx = prisma,
): Promise<string> {
  const slug = slugify(nameEs)
  try {
    const city = await client.city.create({
      data: { countrySlug, slug, nameEs },
    })
    return city.id
  } catch (e: unknown) {
    if ((e as { code?: string })?.code === 'P2002') {
      const existing = await client.city.findUnique({
        where: { countrySlug_slug: { countrySlug, slug } },
      })
      if (existing) return existing.id
    }
    throw e
  }
}

/**
 * Resolves a resource's city from form input: an existing `cityId`, or a
 * `newCityName` to create inline.
 */
export async function resolveCityId(countrySlug: string, fd: FormData): Promise<string | null> {
  const newCityName = (fd.get('newCityName') as string | null)?.trim()
  if (newCityName) return resolveOrCreateCityByName(countrySlug, newCityName)
  return (fd.get('cityId') as string) || null
}
