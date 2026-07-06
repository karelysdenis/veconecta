import { prisma } from '@/lib/prisma'
import { slugify } from '@/lib/slugify'

/**
 * Creates a City by name, reusing an existing one on slug collision — two
 * editors (or two rows of a bulk import) independently adding "the same
 * city" concurrently should land on one row, not two.
 */
export async function resolveOrCreateCityByName(countrySlug: string, nameEs: string): Promise<string> {
  const slug = slugify(nameEs)
  try {
    const city = await prisma.city.create({
      data: { countrySlug, slug, nameEs },
    })
    return city.id
  } catch (e: unknown) {
    if ((e as { code?: string })?.code === 'P2002') {
      const existing = await prisma.city.findUnique({
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
