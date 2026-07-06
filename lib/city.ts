import { prisma } from '@/lib/prisma'
import { slugify } from '@/lib/slugify'
import type { Prisma, PrismaClient } from '@prisma/client'

type PrismaClientOrTx = PrismaClient | Prisma.TransactionClient

/**
 * Finds a City by name, creating it if none exists — two editors (or two
 * rows of a bulk import) independently adding "the same city" concurrently
 * should land on one row, not two. Accepts an explicit client so callers
 * running inside a `prisma.$transaction` can pass their transaction handle
 * instead of writing outside it.
 *
 * Checks existence *before* creating rather than create-then-catch-P2002:
 * inside a Postgres transaction, any error (including a caught one) aborts
 * the whole transaction, so a second query in the catch block would itself
 * fail with "current transaction is aborted". The P2002 catch stays as a
 * fallback for the rare true race the pre-check missed — on the default
 * (non-transactional) client that's still safe to recover from; inside a
 * transaction it simply fails the transaction, which the caller can retry.
 */
export async function resolveOrCreateCityByName(
  countrySlug: string,
  nameEs: string,
  client: PrismaClientOrTx = prisma,
): Promise<string> {
  const slug = slugify(nameEs)

  const existing = await client.city.findUnique({
    where: { countrySlug_slug: { countrySlug, slug } },
  })
  if (existing) return existing.id

  try {
    const city = await client.city.create({
      data: { countrySlug, slug, nameEs },
    })
    return city.id
  } catch (e: unknown) {
    if ((e as { code?: string })?.code === 'P2002') {
      const raced = await client.city.findUnique({
        where: { countrySlug_slug: { countrySlug, slug } },
      })
      if (raced) return raced.id
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
