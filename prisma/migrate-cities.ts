// prisma/migrate-cities.ts
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const VIRTUAL = new Set(['nacional', 'national'])
function isVirtual(city: string) { return VIRTUAL.has(city.toLowerCase()) }

function cityToSlug(city: string): string {
  return city
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

async function main() {
  const resources = await prisma.resource.findMany({
    where: { city: { not: null } },
    select: { id: true, countrySlug: true, city: true, cityId: true },
  })

  // Collect unique (countrySlug, cityName) pairs
  const pairs = new Map<string, { countrySlug: string; cityName: string }>()
  for (const r of resources) {
    if (!r.city || isVirtual(r.city)) continue
    pairs.set(`${r.countrySlug}::${r.city}`, { countrySlug: r.countrySlug, cityName: r.city })
  }

  console.log(`Found ${pairs.size} unique non-virtual city pairs to upsert.`)

  // Upsert City records (idempotent)
  const cityIds = new Map<string, string>() // key → id
  for (const [key, { countrySlug, cityName }] of pairs) {
    const slug = cityToSlug(cityName)
    const city = await prisma.city.upsert({
      where: { countrySlug_slug: { countrySlug, slug } },
      update: {},
      create: {
        countrySlug,
        slug,
        nameEs: cityName,
      },
    })
    cityIds.set(key, city.id)
    console.log(`Upserted: [${countrySlug}] ${cityName} → ${city.slug} (id: ${city.id})`)
  }

  // Update resources with their cityId
  let updated = 0
  let skipped = 0
  for (const r of resources) {
    if (!r.city || isVirtual(r.city)) continue
    const cityId = cityIds.get(`${r.countrySlug}::${r.city}`)
    if (!cityId) continue
    if (r.cityId === cityId) { skipped++; continue }
    await prisma.resource.update({ where: { id: r.id }, data: { cityId } })
    updated++
  }

  console.log(`\nDone: ${cityIds.size} cities upserted, ${updated} resources updated, ${skipped} already set (skipped).`)
}

main().catch(console.error).finally(() => prisma.$disconnect())
