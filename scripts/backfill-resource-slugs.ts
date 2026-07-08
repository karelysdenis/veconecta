// scripts/backfill-resource-slugs.ts
//
// One-off backfill: every existing Resource row gets a slug generated from
// nameEn (falling back to the Spanish name) now that Resource.slug exists.
// Safe to run more than once (skips rows that already have a slug).
//
// Usage: tsx scripts/backfill-resource-slugs.ts [--commit]
// Without --commit this only prints what it would do.

import { PrismaClient } from '@prisma/client'
import { slugify } from '../lib/slugify'

const prisma = new PrismaClient()
const COMMIT = process.argv.includes('--commit')

async function main() {
  const all = await prisma.resource.findMany({
    orderBy: { createdAt: 'asc' },
    select: { id: true, name: true, nameEn: true, slug: true },
  })
  const resources = all.filter((r) => !r.slug)

  console.log(`${resources.length} resource(s) without a slug.`)

  for (const r of resources) {
    const baseSlug = slugify(r.nameEn || r.name)
    let slug = baseSlug
    let suffix = 2
    while (await prisma.resource.findFirst({ where: { slug } })) {
      slug = `${baseSlug}-${suffix}`
      suffix += 1
    }

    console.log(`${r.id}  "${r.nameEn || r.name}"  ->  ${slug}`)
    if (COMMIT) {
      await prisma.resource.update({ where: { id: r.id }, data: { slug } })
    }
  }

  if (!COMMIT) {
    console.log('\nDry run only. Re-run with --commit to write these slugs.')
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
