import { prisma } from '@/lib/prisma'
import { cityToSlug } from '@/lib/slugify'

/**
 * Resolves a resource's city from form input: an existing `cityId`, or a
 * `newCityName` to create inline. Idempotent on slug collision — reuses the
 * existing city instead of erroring, since two editors can independently
 * add "the same city" while triaging incoming resources concurrently.
 */
export async function resolveCityId(countrySlug: string, fd: FormData): Promise<string | null> {
  const newCityName = (fd.get('newCityName') as string | null)?.trim()
  if (newCityName) {
    const slug = cityToSlug(newCityName)
    try {
      const city = await prisma.city.create({
        data: { countrySlug, slug, nameEs: newCityName },
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
  return (fd.get('cityId') as string) || null
}
