import { prisma } from '@/lib/prisma'
import { ResourceStatus } from '@prisma/client'
import { effectiveLocalesForCountry, localizeBare, localizeSuffixed } from '@/lib/locale-content'
import { getActiveLocales, getCountryLocaleMap } from '@/lib/locale-active'
import { resourceCanonicalPath, SITE_URL } from '@/lib/resource-detail'
import type { Metadata } from 'next'

export async function fetchPublishedResourceBySlug(slug: string) {
  return prisma.resource.findUnique({
    where: { slug, status: ResourceStatus.PUBLISHED },
    include: { country: true, city: true },
  })
}

export async function buildResourceMetadata(
  resource: {
    name: string
    nameEn: string | null
    namePt: string | null
    nameFr: string | null
    nameDe: string | null
    notesEs: string | null
    notesEn: string | null
    notesPt: string | null
    notesFr: string | null
    notesDe: string | null
    kind: 'PERMANENT' | 'EVENT'
    slug: string
    countrySlug: string
  },
  locale: string,
): Promise<Metadata> {
  const resourceName = localizeBare(resource, 'name', locale)
  const description = localizeSuffixed(resource, 'notes', locale) ?? undefined

  const [activeLocales, countryLocaleMap] = await Promise.all([
    getActiveLocales(),
    getCountryLocaleMap(),
  ])
  const effectiveLocales = effectiveLocalesForCountry(
    resource.countrySlug,
    activeLocales.map((l) => l.code),
    countryLocaleMap,
  )

  return {
    title: `${resourceName} | VEconecta`,
    description,
    openGraph: {
      type: 'website',
      siteName: 'VEconecta',
      title: `${resourceName} | VEconecta`,
      description,
      images: [{ url: `/api/og?locale=${locale}`, width: 1200, height: 630 }],
    },
    alternates: {
      canonical: `${SITE_URL}${resourceCanonicalPath(resource, locale)}`,
      languages: Object.fromEntries(
        effectiveLocales.map((l) => [l, `${SITE_URL}${resourceCanonicalPath(resource, l)}`]),
      ),
    },
  }
}
