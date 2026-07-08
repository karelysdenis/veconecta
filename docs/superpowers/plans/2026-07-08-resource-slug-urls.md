# URLs con slug para iniciativas y eventos + hreflang Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace `/[locale]/recursos/[id]` (raw cuid) with readable, SEO-friendly URLs: `/[locale]/initiatives/[slug]` for regular resources and `/[locale]/events/[slug]` for `kind === 'EVENT'` resources, add `hreflang` (`alternates.languages`) to the detail page, and keep old `/recursos/[id]` links working forever via redirect.

**Architecture:** `Resource` gains a globally-unique `slug` column, generated once at creation from the English name (falling back to Spanish), editable afterward. A pure `resourceCanonicalPath()` helper (no DB access, safe for client components) builds the canonical URL from `{ kind, slug }`; a server-only `lib/resource-metadata.ts` builds the shared `generateMetadata()` (including hreflang) both new routes need. The old detail-page render logic is extracted into a shared `ResourceDetailView` component so both new routes stay thin wrappers around one shared query + one shared render.

**Tech Stack:** Next.js 16 App Router, Prisma, PostgreSQL, TypeScript, Vitest, next-intl.

## Global Constraints

- `tsc --noEmit` must stay clean and `vitest run` (full suite) must pass after every task.
- No new dependencies.
- Route segment words are English and locale-invariant: `initiatives`/`events`, not translated per locale (same reasoning already applied to `Country.slug`, see spec).
- The slug is generated from `nameEn` (fallback to `name`), never per-locale.
- `/[locale]/recursos/[id]` must keep working (redirect to the new canonical URL) indefinitely: already-shared links during the active emergency must not break.

---

### Task 1: Add a nullable, unique `slug` column to `Resource`

**Files:**
- Modify: `prisma/schema.prisma`

**Interfaces:**
- Produces: `Resource.slug: string | null` (until Task 3 makes it required).

- [ ] **Step 1: Add the field**

In `prisma/schema.prisma`, in `model Resource`, add `slug` right after `name`:

```prisma
model Resource {
  id          String           @id @default(cuid())
  countrySlug String
  country     Country          @relation(fields: [countrySlug], references: [slug])
  category    ResourceCategory
  name        String
  slug        String?          @unique
  nameEn      String?
  namePt      String?
  nameFr      String?
  nameDe      String?
  cityId      String?
  city        City?            @relation(fields: [cityId], references: [id])
  url         String?
  phone       String?
  paymentKey  String?
  address     String?
  schedule    String?
  free        Boolean          @default(false)
  notesEs     String?
  notesEn     String?
  notesPt     String?
  notesFr     String?
  notesDe     String?
  status      ResourceStatus   @default(DRAFT)
  verifiedAt  DateTime?
  verifiedBy  String?
  validUntil  DateTime?
  kind          ResourceKind @default(PERMANENT)
  eventStartsAt DateTime?
  eventEndsAt   DateTime?
  createdAt   DateTime         @default(now())
  updatedAt   DateTime         @updatedAt

  @@index([status])
  @@index([countrySlug])
  @@index([cityId])
  @@index([kind])

  // Trigram indexes back the ILIKE '%term%' substring search in /api/search
  // and /buscar — a plain btree index can't accelerate that query shape.
  @@index([name(ops: raw("gin_trgm_ops"))], type: Gin)
  // ... (rest of the existing trigram indexes, unchanged)
}
```

Only the `slug String? @unique` line is new; leave every other line in the model exactly as it is today.

- [ ] **Step 2: Generate and apply the migration**

Run: `npx prisma migrate dev --name add_resource_slug`
Expected: a new folder under `prisma/migrations/` containing `ALTER TABLE "Resource" ADD COLUMN "slug" TEXT; CREATE UNIQUE INDEX "Resource_slug_key" ON "Resource"("slug");` (Postgres allows multiple `NULL`s under a unique index, so this is safe to apply with existing data still unslugged).

- [ ] **Step 3: Verify**

Run: `npx tsc --noEmit`: expect clean (the generated Prisma client now types `slug: string | null`).

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "feat: add nullable unique slug column to Resource"
```

---

### Task 2: Backfill slugs for existing resources

**Files:**
- Create: `scripts/backfill-resource-slugs.ts`

**Interfaces:**
- Consumes: `slugify` from `../lib/slugify` (relative import: this script runs standalone via `tsx`, not through Next's `@/` path alias, same as `scripts/import-france.ts` and `prisma/seed.ts`).

- [ ] **Step 1: Create the script**

```ts
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
  const resources = await prisma.resource.findMany({
    where: { slug: null },
    orderBy: { createdAt: 'asc' },
    select: { id: true, name: true, nameEn: true },
  })

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
```

- [ ] **Step 2: Dry run against the local dev database**

Run: `npx tsx scripts/backfill-resource-slugs.ts`
Expected: prints one line per resource with the slug it *would* assign, ends with "Dry run only." No rows are modified (confirm with `npx tsx -e "..."` or a quick Prisma Studio check if in doubt).

- [ ] **Step 3: Commit the script**

Run: `npx tsc --noEmit`: expect clean.

```bash
git add scripts/backfill-resource-slugs.ts
git commit -m "feat: add one-off backfill script for Resource.slug"
```

- [ ] **Step 4: Apply the backfill to the local dev database**

Run: `npx tsx scripts/backfill-resource-slugs.ts --commit`
Expected: same output as Step 2, but this time every resource is updated. Verify: `npx prisma studio` (or a one-off query) shows no `Resource` rows with `slug = null`.

This step has no file changes to commit; it's a data-only change to the local dev database. **Production note (out of this session's scope, no `DATABASE_URL` access to prod from this machine):** the same script must run against production data (`--commit`) *before* the deploy that includes Task 3's migration, or `prisma migrate deploy` will fail on the `NOT NULL` constraint during the Vercel build.

---

### Task 3: Make `slug` required

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Change the field**

In `prisma/schema.prisma`, change:

```prisma
  slug        String?          @unique
```

to:

```prisma
  slug        String           @unique
```

- [ ] **Step 2: Generate and apply the migration**

Run: `npx prisma migrate dev --name make_resource_slug_required`
Expected: succeeds locally (every row already has a slug from Task 2). If it fails with a `NOT NULL` violation, Task 2's backfill wasn't fully applied. re-run Task 2 Step 4 first.

- [ ] **Step 3: Verify**

Run: `npx tsc --noEmit`: expect clean (Prisma client now types `slug: string`, no longer nullable).
Run: `npm test`: expect all existing tests to still pass.

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "feat: make Resource.slug required"
```

---

### Task 4: `resourceCanonicalPath()` (pure, client-safe)

**Files:**
- Create: `lib/resource-detail.ts`
- Test: `tests/lib/resource-detail.test.ts`

**Interfaces:**
- Produces: `resourceCanonicalPath(resource: { kind: ResourceKind; slug: string }, locale: string): string`. No Prisma import: this file must stay safe to import from `'use client'` components (`ResourceLink`, `SearchOverlay`), same reasoning as the existing `lib/locale-content.ts` vs `lib/locale-active.ts` split.

- [ ] **Step 1: Write the failing test**

Create `tests/lib/resource-detail.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { resourceCanonicalPath } from '@/lib/resource-detail'

describe('resourceCanonicalPath', () => {
  it('builds an /initiatives/ path for a non-event resource', () => {
    expect(resourceCanonicalPath({ kind: 'PERMANENT', slug: 'acnur-espana' }, 'es')).toBe(
      '/es/initiatives/acnur-espana',
    )
  })

  it('builds an /events/ path for an EVENT resource', () => {
    expect(resourceCanonicalPath({ kind: 'EVENT', slug: 'jornada-donacion-madrid' }, 'es')).toBe(
      '/es/events/jornada-donacion-madrid',
    )
  })

  it('uses the given locale segment regardless of resource content', () => {
    expect(resourceCanonicalPath({ kind: 'PERMANENT', slug: 'acnur-espana' }, 'en')).toBe(
      '/en/initiatives/acnur-espana',
    )
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/lib/resource-detail.test.ts`
Expected: FAIL: `Cannot find module '@/lib/resource-detail'`

- [ ] **Step 3: Create `lib/resource-detail.ts`**

```ts
import type { ResourceKind } from '@prisma/client'

/** '/es/initiatives/slug' or '/es/events/slug' — the one canonical URL for a resource, regardless of locale segment. */
export function resourceCanonicalPath(resource: { kind: ResourceKind; slug: string }, locale: string): string {
  const segment = resource.kind === 'EVENT' ? 'events' : 'initiatives'
  return `/${locale}/${segment}/${resource.slug}`
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/lib/resource-detail.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Full verification and commit**

Run: `npx tsc --noEmit`: expect clean.
Run: `npm test`: expect all tests pass.

```bash
git add lib/resource-detail.ts tests/lib/resource-detail.test.ts
git commit -m "feat: add resourceCanonicalPath helper"
```

---

### Task 5: Shared query + metadata builder (server-only, with hreflang)

**Files:**
- Create: `lib/resource-metadata.ts`

**Interfaces:**
- Consumes: `resourceCanonicalPath` (Task 4); `effectiveLocalesForCountry`, `localizeBare`, `localizeSuffixed` from `@/lib/locale-content`; `getActiveLocales`, `getCountryLocaleMap` from `@/lib/locale-active`; `prisma` from `@/lib/prisma`.
- Produces: `fetchPublishedResourceBySlug(slug: string)`, `buildResourceMetadata(resource, locale: string): Promise<Metadata>`.

No automated test: this is a thin DB-query + metadata orchestrator (same category as `lib/resource-review.ts#fetchResourcesByIds`), verified in Task 12's manual pass. It imports `prisma` (via `lib/locale-active.ts`), so it must **not** be imported from any `'use client'` component: only from Server Component `page.tsx` files.

- [ ] **Step 1: Create `lib/resource-metadata.ts`**

```ts
import { prisma } from '@/lib/prisma'
import { ResourceStatus } from '@prisma/client'
import { effectiveLocalesForCountry, localizeBare, localizeSuffixed } from '@/lib/locale-content'
import { getActiveLocales, getCountryLocaleMap } from '@/lib/locale-active'
import { resourceCanonicalPath } from '@/lib/resource-detail'
import type { Metadata } from 'next'

const SITE_URL = 'https://www.veconecta.org'

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
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`: expect clean.

- [ ] **Step 3: Commit**

```bash
git add lib/resource-metadata.ts
git commit -m "feat: add shared resource metadata builder with hreflang"
```

---

### Task 6: Extract the detail-page render into `ResourceDetailView`

**Files:**
- Create: `components/ResourceDetailView.tsx`

**Interfaces:**
- Produces: `ResourceDetailView({ resource, locale }: { resource: ResourceWithRelations; locale: string })`: an async Server Component containing the exact render currently in `app/[locale]/recursos/[id]/page.tsx` (lines 56-217 of that file today), unchanged.

No automated test: this is a direct lift of already-shipped, unchanged JSX (verified visually in Task 12).

- [ ] **Step 1: Create `components/ResourceDetailView.tsx`**

```tsx
import Link from 'next/link'
import { Calendar } from 'lucide-react'
import { getTranslations } from 'next-intl/server'
import { ReportForm } from '@/components/ReportForm'
import { localizeBare, localizeSuffixed, formatEventRange, INTL_LOCALE, type Locale } from '@/lib/locale-content'
import { cleanUrlDisplay } from '@/lib/format-url'
import type { City, Country, Resource } from '@prisma/client'

type ResourceWithRelations = Resource & { country: Country; city: City | null }

export async function ResourceDetailView({
  resource,
  locale,
}: {
  resource: ResourceWithRelations
  locale: string
}) {
  const [tNav, tDetail, tCat] = await Promise.all([
    getTranslations('nav'),
    getTranslations('resourceDetail'),
    getTranslations('categories'),
  ])

  const countryName = localizeSuffixed(resource.country, 'name', locale) ?? resource.country.nameEs
  const displayName = localizeBare(resource, 'name', locale)
  const notes = localizeSuffixed(resource, 'notes', locale)
  const categoryLabel = tCat(resource.category)
  const cityName = resource.city ? (localizeSuffixed(resource.city, 'name', locale) ?? resource.city.nameEs) : null

  const intlLocale = INTL_LOCALE[locale as Locale] ?? INTL_LOCALE.es
  const fmt = (date: Date) =>
    new Intl.DateTimeFormat(intlLocale, { day: 'numeric', month: 'short', year: 'numeric' }).format(date)

  const verifiedDate = resource.verifiedAt ? fmt(resource.verifiedAt) : null
  const isEvent = resource.kind === 'EVENT'
  const validUntilDate = !isEvent && resource.validUntil ? fmt(resource.validUntil) : null
  const eventRangeStr = isEvent
    ? formatEventRange(
        resource.eventStartsAt?.toISOString() ?? null,
        resource.eventEndsAt?.toISOString() ?? null,
        locale as Locale,
      )
    : null

  const isGlobal = resource.countrySlug === 'global'
  const countrySlug = isGlobal ? null : resource.countrySlug

  const urlDisplay = resource.url ? cleanUrlDisplay(resource.url) : null
  const paymentLabel = resource.countrySlug === 'spain' ? tDetail('bizum') : tDetail('paymentKey')

  return (
    <main className="min-h-screen bg-white pb-10">
      {/* Breadcrumb */}
      <div className="bg-coco h-10 flex items-center px-5 gap-1.5 overflow-x-auto whitespace-nowrap">
        <Link href={`/${locale}`} className="font-sans font-normal text-sm text-caribe hover:underline shrink-0">
          {tNav('home')}
        </Link>
        {countrySlug && (
          <>
            <span className="font-sans text-sm text-[#b8b8b8] shrink-0">›</span>
            <Link href={`/${locale}/${countrySlug}`} className="font-sans font-normal text-sm text-caribe hover:underline shrink-0">
              {countryName}
            </Link>
          </>
        )}
        <span className="font-sans text-sm text-[#b8b8b8] shrink-0">›</span>
        <span className="font-sans font-normal text-sm text-[#141414] shrink-0">{categoryLabel}</span>
      </div>

      <div className="px-5 pt-5 pb-6 space-y-5">
        {/* Name + meta */}
        <div>
          <h1 className="font-display font-extrabold text-[28px] leading-[1.1] tracking-[-0.01em] text-[#141414]">
            {displayName}
          </h1>
          {eventRangeStr && (
            <span className="inline-flex items-center gap-1 font-sans font-medium text-[11px] text-caribe bg-caribe/10 rounded-full px-2 py-0.5 mt-2">
              <Calendar size={11} strokeWidth={2.5} className="shrink-0" />
              {eventRangeStr}
            </span>
          )}
          {validUntilDate && (
            <span className="inline-flex items-center font-sans font-medium text-[11px] text-guacamaya bg-amber-50 rounded-full px-2 py-0.5 mt-2">
              {tDetail('expiresOn')} {validUntilDate}
            </span>
          )}
        </div>

        {/* Description */}
        {notes && (
          <p className="font-sans font-light text-[15px] text-[#141414] leading-relaxed">
            {notes}
          </p>
        )}

        {/* Key info */}
        {(resource.url || resource.phone || resource.paymentKey || resource.address || resource.schedule || resource.free || cityName) && (
          <div className="divide-y divide-[rgba(20,20,20,0.08)] border-t border-[rgba(20,20,20,0.08)]">
            {cityName && (
              <div className="py-3 flex items-center justify-between gap-4">
                <span className="font-sans text-[13px] text-[#808080] shrink-0">{tDetail('city')}</span>
                <span className="font-sans text-[13px] text-[#141414]">{cityName}</span>
              </div>
            )}
            {resource.free && (
              <div className="py-3 flex items-center justify-between">
                <span className="font-sans text-[13px] text-[#808080]">{tDetail('free')}</span>
                <span className="font-sans font-semibold text-[13px] text-[#141414]">✓</span>
              </div>
            )}
            {resource.url && urlDisplay && (
              <div className="py-3 flex items-start justify-between gap-4">
                <span className="font-sans text-[13px] text-[#808080] shrink-0">{tDetail('website')}</span>
                <a
                  href={resource.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-sans text-[13px] text-caribe text-right break-all"
                >
                  {urlDisplay}
                </a>
              </div>
            )}
            {resource.paymentKey && (
              <div className="py-3 flex items-center justify-between gap-4">
                <span className="font-sans text-[13px] text-[#808080] shrink-0">{paymentLabel}</span>
                <span className="font-sans font-semibold text-[13px] text-[#141414]">{resource.paymentKey}</span>
              </div>
            )}
            {resource.phone && (
              <div className="py-3 flex items-center justify-between gap-4">
                <span className="font-sans text-[13px] text-[#808080] shrink-0">{tDetail('phone')}</span>
                <a
                  href={`tel:${resource.phone.replace(/[^+\d]/g, '')}`}
                  className="font-sans text-[13px] text-caribe"
                >
                  {resource.phone}
                </a>
              </div>
            )}
            {resource.address && (
              <div className="py-3 flex items-start justify-between gap-4">
                <span className="font-sans text-[13px] text-[#808080] shrink-0">{tDetail('address')}</span>
                <span className="font-sans text-[13px] text-[#141414] text-right">{resource.address}</span>
              </div>
            )}
            {resource.schedule && (
              <div className="py-3 flex items-start justify-between gap-4">
                <span className="font-sans text-[13px] text-[#808080] shrink-0">{tDetail('schedule')}</span>
                <span className="font-sans text-[13px] text-[#141414] text-right">{resource.schedule}</span>
              </div>
            )}
          </div>
        )}

        {/* CTA */}
        {resource.url && (
          <a
            href={resource.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full h-12 rounded-xl bg-caribe text-white font-sans font-semibold text-[15px] hover:bg-caribe/90 transition-colors"
          >
            {tDetail('goToResource')} ↗
          </a>
        )}
        {resource.phone && !resource.url && (
          <a
            href={`tel:${resource.phone.replace(/[^+\d]/g, '')}`}
            className="flex items-center justify-center gap-2 w-full h-12 rounded-xl bg-caribe text-white font-sans font-semibold text-[15px] hover:bg-caribe/90 transition-colors"
          >
            {tDetail('callNow')} →
          </a>
        )}

        {verifiedDate && (
          <p className="font-sans font-light text-[13px] text-guacamaya text-center">
            {tDetail('verifiedBy')} · {verifiedDate}
          </p>
        )}

        <div className="pt-6 border-t border-[rgba(20,20,20,0.08)]">
          <ReportForm countrySlug={resource.countrySlug} resourceId={resource.id} />
        </div>
      </div>
    </main>
  )
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`: expect clean.

- [ ] **Step 3: Commit**

```bash
git add components/ResourceDetailView.tsx
git commit -m "feat: extract ResourceDetailView from the resource detail page"
```

---

### Task 7: New route `/[locale]/initiatives/[slug]`

**Files:**
- Create: `app/[locale]/initiatives/[slug]/page.tsx`

**Interfaces:**
- Consumes: `fetchPublishedResourceBySlug`, `buildResourceMetadata` (Task 5); `resourceCanonicalPath` (Task 4); `ResourceDetailView` (Task 6).

- [ ] **Step 1: Create the route**

```tsx
import { notFound, redirect } from 'next/navigation'
import { setRequestLocale } from 'next-intl/server'
import { ResourceDetailView } from '@/components/ResourceDetailView'
import { fetchPublishedResourceBySlug, buildResourceMetadata } from '@/lib/resource-metadata'
import { resourceCanonicalPath } from '@/lib/resource-detail'
import type { Metadata } from 'next'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>
}): Promise<Metadata> {
  const { locale, slug } = await params
  const resource = await fetchPublishedResourceBySlug(slug)
  if (!resource) return {}
  return buildResourceMetadata(resource, locale)
}

export default async function InitiativeDetailPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>
}) {
  const { locale, slug } = await params
  setRequestLocale(locale)

  const resource = await fetchPublishedResourceBySlug(slug)
  if (!resource) notFound()
  if (resource.kind === 'EVENT') redirect(resourceCanonicalPath(resource, locale))

  return <ResourceDetailView resource={resource} locale={locale} />
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`: expect clean.

- [ ] **Step 3: Commit**

```bash
git add "app/[locale]/initiatives/[slug]/page.tsx"
git commit -m "feat: add /initiatives/[slug] resource detail route"
```

---

### Task 8: New route `/[locale]/events/[slug]`

**Files:**
- Create: `app/[locale]/events/[slug]/page.tsx`

Mirrors Task 7 exactly, with the kind check inverted.

- [ ] **Step 1: Create the route**

```tsx
import { notFound, redirect } from 'next/navigation'
import { setRequestLocale } from 'next-intl/server'
import { ResourceDetailView } from '@/components/ResourceDetailView'
import { fetchPublishedResourceBySlug, buildResourceMetadata } from '@/lib/resource-metadata'
import { resourceCanonicalPath } from '@/lib/resource-detail'
import type { Metadata } from 'next'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>
}): Promise<Metadata> {
  const { locale, slug } = await params
  const resource = await fetchPublishedResourceBySlug(slug)
  if (!resource) return {}
  return buildResourceMetadata(resource, locale)
}

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>
}) {
  const { locale, slug } = await params
  setRequestLocale(locale)

  const resource = await fetchPublishedResourceBySlug(slug)
  if (!resource) notFound()
  if (resource.kind !== 'EVENT') redirect(resourceCanonicalPath(resource, locale))

  return <ResourceDetailView resource={resource} locale={locale} />
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`: expect clean.

- [ ] **Step 3: Commit**

```bash
git add "app/[locale]/events/[slug]/page.tsx"
git commit -m "feat: add /events/[slug] resource detail route"
```

---

### Task 9: Turn `/recursos/[id]` into a permanent redirect

**Files:**
- Modify: `app/[locale]/recursos/[id]/page.tsx` (full rewrite)

**Interfaces:**
- Consumes: `resourceCanonicalPath` (Task 4).

- [ ] **Step 1: Replace the file contents**

Replace the entire contents of `app/[locale]/recursos/[id]/page.tsx` with:

```tsx
import { notFound, redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { ResourceStatus } from '@prisma/client'
import { resourceCanonicalPath } from '@/lib/resource-detail'

/**
 * Legacy URL, kept working forever: links already shared on WhatsApp/social
 * during the active emergency must not 404 just because the URL scheme
 * changed to /initiatives/[slug] and /events/[slug].
 */
export default async function LegacyResourceRedirect({
  params,
}: {
  params: Promise<{ locale: string; id: string }>
}) {
  const { locale, id } = await params
  const resource = await prisma.resource.findUnique({
    where: { id, status: ResourceStatus.PUBLISHED },
    select: { slug: true, kind: true },
  })
  if (!resource) notFound()
  redirect(resourceCanonicalPath(resource, locale))
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`: expect clean.

- [ ] **Step 3: Commit**

```bash
git add "app/[locale]/recursos/[id]/page.tsx"
git commit -m "feat: redirect legacy /recursos/[id] links to the new canonical URL"
```

---

### Task 10: Generate a slug when creating a resource

**Files:**
- Modify: `app/admin/(dashboard)/[country]/new/page.tsx`

**Interfaces:**
- Consumes: `slugify` from `@/lib/slugify`.

- [ ] **Step 1: Add the import**

Add alongside the existing imports:

```tsx
import { slugify } from '@/lib/slugify'
```

- [ ] **Step 2: Generate the slug inside `create()`**

In the `create` server action, right after `const name = (fd.get('name') as string).trim()`, add:

```tsx
    const nameEnRaw = (fd.get('nameEn') as string | null)?.trim() || null
    const baseSlug = slugify(nameEnRaw || name)
    let slug = baseSlug
    let suffix = 2
    while (await prisma.resource.findFirst({ where: { slug } })) {
      slug = `${baseSlug}-${suffix}`
      suffix += 1
    }
```

Then add `slug,` to the `data: { ... }` object passed to `prisma.resource.create`, right after `name,`:

```tsx
    const resource = await prisma.resource.create({
      data: {
        countrySlug: country,
        name,
        slug,
        ...localizedFieldsFromForm(fd, 'name'),
```

**Note:** `nameEnRaw` is read directly from `fd.get('nameEn')` here rather than through `localizedFieldsFromForm(fd, 'name')` because the slug needs to be computed *before* that helper's return value is spread into `data`, and reading the same form field twice is harmless (the value doesn't change between reads).

- [ ] **Step 3: Verify it compiles**

Run: `npx tsc --noEmit`: expect clean.

- [ ] **Step 4: Commit**

```bash
git add "app/admin/(dashboard)/[country]/new/page.tsx"
git commit -m "feat: generate a unique slug when creating a resource"
```

---

### Task 11: Editable slug field on the resource edit form + preview link update

**Files:**
- Modify: `app/admin/(dashboard)/[country]/[id]/page.tsx`

**Interfaces:**
- Consumes: `slugify` from `@/lib/slugify`; `resourceCanonicalPath` from `@/lib/resource-detail`.

- [ ] **Step 1: Add the imports**

Add alongside the existing imports:

```tsx
import { slugify } from '@/lib/slugify'
import { resourceCanonicalPath } from '@/lib/resource-detail'
```

- [ ] **Step 2: Add slug generation/validation to `save()`**

In the `save` server action, right after `const name = (fd.get('name') as string).trim()`, add:

```tsx
    const rawSlug = (fd.get('slug') as string).trim()
    const baseSlug = slugify(rawSlug || name)
    let slug = baseSlug
    let suffix = 2
    while (await prisma.resource.findFirst({ where: { slug, id: { not: id } } })) {
      slug = `${baseSlug}-${suffix}`
      suffix += 1
    }
```

`id: { not: id }` excludes the resource's own row from the collision check, so saving the form without touching the slug field never falsely "collides with itself." Re-running the submitted value through `slugify()` (rather than trusting it verbatim, unlike the pre-existing `Post` edit form) guarantees the field always holds a URL-safe value even if an admin types spaces or accents into it.

Then add `slug,` to the `data: { ... }` object, right after `name,`:

```tsx
      data: {
        name,
        slug,
        ...localizedFieldsFromForm(fd, 'name'),
```

- [ ] **Step 3: Add the Slug field to the form**

Insert a new `F` field right after the Categoría/Estado grid (after the closing `</div>` of that grid, before `<UrlField ... />`):

```tsx
        <F label="Slug (URL)" name="slug" defaultValue={resource.slug} required />

        <UrlField defaultValue={resource.url ?? ''} />
```

- [ ] **Step 4: Point the preview link at the new canonical URL**

Replace:

```tsx
        {resource.status === 'PUBLISHED' && (
          <a
            href={`/${DEFAULT_LOCALE}/recursos/${resource.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto shrink-0 text-xs text-caribe hover:underline flex items-center gap-1"
          >
            Ver en el sitio ↗
          </a>
        )}
```

with:

```tsx
        {resource.status === 'PUBLISHED' && (
          <a
            href={resourceCanonicalPath(resource, DEFAULT_LOCALE)}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto shrink-0 text-xs text-caribe hover:underline flex items-center gap-1"
          >
            Ver en el sitio ↗
          </a>
        )}
```

- [ ] **Step 5: Verify it compiles**

Run: `npx tsc --noEmit`: expect clean.

- [ ] **Step 6: Commit**

```bash
git add "app/admin/(dashboard)/[country]/[id]/page.tsx"
git commit -m "feat: add editable slug field to the resource editor, link preview to canonical URL"
```

---

### Task 12: Regenerate slug on duplicate + preview icon link update

**Files:**
- Modify: `app/admin/(dashboard)/[country]/page.tsx`

**Interfaces:**
- Consumes: `slugify` from `@/lib/slugify`; `resourceCanonicalPath` from `@/lib/resource-detail`.

- [ ] **Step 1: Add the imports**

Add alongside the existing imports:

```tsx
import { slugify } from '@/lib/slugify'
import { resourceCanonicalPath } from '@/lib/resource-detail'
```

- [ ] **Step 2: Fix `duplicateResource` to generate a fresh slug**

The source resource's `slug` is unique, so spreading `...fields` (which includes `slug`) straight into `prisma.resource.create` would violate the unique constraint. Replace:

```tsx
  async function duplicateResource(formData: FormData) {
    'use server'
    const id = formData.get('id') as string
    const { user } = await getSession()
    if (!canManageCountry(user, country)) return
    const src = await prisma.resource.findUnique({ where: { id } })
    if (!src || src.countrySlug !== country) return
    const { id: _id, createdAt: _c, updatedAt: _u, verifiedAt: _va, verifiedBy: _vb, status: _s, ...fields } = src
    const copy = await prisma.resource.create({
      data: { ...fields, status: 'DRAFT', verifiedAt: null, verifiedBy: null },
    })
```

with:

```tsx
  async function duplicateResource(formData: FormData) {
    'use server'
    const id = formData.get('id') as string
    const { user } = await getSession()
    if (!canManageCountry(user, country)) return
    const src = await prisma.resource.findUnique({ where: { id } })
    if (!src || src.countrySlug !== country) return
    const { id: _id, slug: _slug, createdAt: _c, updatedAt: _u, verifiedAt: _va, verifiedBy: _vb, status: _s, ...fields } = src
    const baseSlug = slugify(src.nameEn || src.name)
    let slug = baseSlug
    let suffix = 2
    while (await prisma.resource.findFirst({ where: { slug } })) {
      slug = `${baseSlug}-${suffix}`
      suffix += 1
    }
    const copy = await prisma.resource.create({
      data: { ...fields, slug, status: 'DRAFT', verifiedAt: null, verifiedBy: null },
    })
```

(The source's own slug already exists in the database, so the first collision check inside the loop always fails at least once, naturally bumping the copy to `-2`.)

- [ ] **Step 3: Point the preview icon at the new canonical URL**

Replace:

```tsx
                  <a
                    href={`/${DEFAULT_LOCALE}/recursos/${r.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Ver en el sitio"
                    aria-label="Ver en el sitio"
                    className="border border-gray-300 text-gray-500 px-2.5 py-1.5 rounded hover:bg-gray-50 flex items-center"
                  >
                    <ExternalLink size={14} />
                  </a>
```

with:

```tsx
                  <a
                    href={resourceCanonicalPath(r, DEFAULT_LOCALE)}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Ver en el sitio"
                    aria-label="Ver en el sitio"
                    className="border border-gray-300 text-gray-500 px-2.5 py-1.5 rounded hover:bg-gray-50 flex items-center"
                  >
                    <ExternalLink size={14} />
                  </a>
```

- [ ] **Step 4: Verify it compiles**

Run: `npx tsc --noEmit`: expect clean.

- [ ] **Step 5: Commit**

```bash
git add "app/admin/(dashboard)/[country]/page.tsx"
git commit -m "fix: regenerate slug on resource duplication, link preview icon to canonical URL"
```

---

### Task 13: Wire the canonical URL into search results and public listings

**Files:**
- Modify: `lib/search.ts`
- Modify: `components/ResourceLink.tsx`
- Modify: `components/SearchResultLink.tsx`
- Modify: `components/SearchOverlay.tsx`

**Interfaces:**
- Consumes: `resourceCanonicalPath` from `@/lib/resource-detail` (Task 4).

- [ ] **Step 1: Add `slug` to `lib/search.ts`'s select**

In `RESOURCE_SELECT`, add `slug: true` right after `id: true`:

```ts
const RESOURCE_SELECT = {
  id: true,
  slug: true,
  name: true,
  nameEn: true,
```

- [ ] **Step 2: Update `ResourceLink.tsx`**

`SerializedResource` (from `@/lib/types`) already includes `slug` and `kind` automatically (it's `Omit<Resource, ...>` and neither field is omitted), so no type change is needed there. Add the import alongside the existing ones:

```tsx
import { resourceCanonicalPath } from '@/lib/resource-detail'
```

Replace:

```tsx
      <Link
        href={`/${locale}/recursos/${resource.id}`}
        className="absolute inset-0"
        aria-label={name}
      />
```

with:

```tsx
      <Link
        href={resourceCanonicalPath(resource, locale)}
        className="absolute inset-0"
        aria-label={name}
      />
```

- [ ] **Step 3: Update `SearchResultLink.tsx`**

Add `slug: string` to the `ResourceWithCountry` type, right after `name: string`:

```tsx
type ResourceWithCountry = {
  id: string
  name: string
  slug: string
  url: string | null
  countrySlug: string
  kind: ResourceKind
```

Add the import alongside the existing ones:

```tsx
import { resourceCanonicalPath } from '@/lib/resource-detail'
```

Replace:

```tsx
      <Link
        href={`/${locale}/recursos/${resource.id}`}
        className="absolute inset-0"
        aria-label={name}
      />
```

with:

```tsx
      <Link
        href={resourceCanonicalPath(resource, locale)}
        className="absolute inset-0"
        aria-label={name}
      />
```

- [ ] **Step 4: Update `SearchOverlay.tsx`**

Add `slug: string` to the `Result` type, right after `name: string`:

```tsx
type Result = {
  id: string
  name: string
  slug: string
  url: string | null
  category: ResourceCategory
```

Add the import alongside the existing ones:

```tsx
import { resourceCanonicalPath } from '@/lib/resource-detail'
```

Replace (inside `ResultRow`):

```tsx
      <Link
        href={`/${locale}/recursos/${result.id}`}
        onClick={onClose}
        className="absolute inset-0"
        aria-label={name}
      />
```

with:

```tsx
      <Link
        href={resourceCanonicalPath(result, locale)}
        onClick={onClose}
        className="absolute inset-0"
        aria-label={name}
      />
```

- [ ] **Step 5: Verify it compiles**

Run: `npx tsc --noEmit`: expect clean (this also confirms `results`/`fallback` from `searchResources()` structurally satisfy the updated `ResourceWithCountry` type, since both now require `slug`).
Run: `npm test`: expect all tests pass.

- [ ] **Step 6: Commit**

```bash
git add lib/search.ts components/ResourceLink.tsx components/SearchResultLink.tsx components/SearchOverlay.tsx
git commit -m "feat: link to the new canonical /initiatives//events URLs from cards and search"
```

---

### Task 14: End-to-end verification and memory update

**Files:** none (manual verification + memory update only)

- [ ] **Step 1: Start the dev server**

Run: `npm run dev` (background). If port 3000 is already taken by another session's dev server, verify against that same server; don't kill it.

- [ ] **Step 2: Verify a non-event resource**

Pick a `PERMANENT` resource (e.g. the GoFundMe one used earlier this session). Confirm:
- `/es/initiatives/[its-slug]` renders the same content that `/es/recursos/[id]` used to.
- Visiting the old `/es/recursos/[id]` URL redirects to `/es/initiatives/[its-slug]`.
- The generated HTML `<head>` includes `<link rel="canonical">` and `<link rel="alternate" hreflang="...">` tags for each active locale of that resource's country.

- [ ] **Step 3: Verify an event resource**

Same checks as Step 2, but for a `kind: 'EVENT'` resource, confirming it lives under `/es/events/[slug]` instead.

- [ ] **Step 4: Verify the admin flows**

- Create a new resource with an English name filled in; confirm the generated slug matches the English name, not the Spanish one.
- Edit an existing resource's Slug field to something else; save; confirm the public URL moved to the new slug and the old one now 404s (expected: it's not the `/recursos/[id]` legacy path, so no redirect is expected here, only for the id-based legacy route).
- Duplicate a published resource from the country list; confirm the duplicate got a different slug (e.g. `originalslug-2`), not a save error.
- Click "Ver en el sitio" (editor) and the preview icon (country list) for a published resource; confirm both open the new `/initiatives/` or `/events/` URL directly, not `/recursos/`.

- [ ] **Step 5: Verify search and listings**

Search for a resource in `/buscar` and the header overlay; confirm the result links to the new canonical URL. Open a country page; confirm resource cards link to the new canonical URL too.

- [ ] **Step 6: Run the full verification suite one more time**

Run: `npx tsc --noEmit`: expect clean.
Run: `npm test`: expect all tests pass.

- [ ] **Step 7: Update project memory**

Update `project-veconecta.md` with a new dated section summarizing: the new URL scheme (`/initiatives/[slug]`, `/events/[slug]`), the slug generation/collision rules, the `/recursos/[id]` redirect, the hreflang addition, and the **production deployment risk** flagged in Task 2 (the backfill script must run against production data before the `make_resource_slug_required` migration reaches `prisma migrate deploy`, or the Vercel build will fail).

---

## Self-Review Notes

- **Spec coverage:** "Segmentos de ruta en inglés" → Tasks 4, 7, 8. "El slug se genera del nombre en inglés" → Tasks 10, 12 (and Task 2's backfill). "Slug editable" → Task 11. "Redirect de las URLs viejas" → Task 9. "Hreflang" → Task 5. "Actualizar los que enlazan al recurso" → Tasks 11, 12, 13 (all 5 call sites: `ResourceLink`, `SearchResultLink`, `SearchOverlay`, the editor preview link, the country-list preview icon). "Migración de datos" → Tasks 1-3.
- **Placeholder scan:** none found; every step has literal file contents, exact diffs, or exact commands.
- **Type consistency:** `resourceCanonicalPath(resource: { kind: ResourceKind; slug: string }, locale: string)` (Task 4) is called identically in Tasks 7, 8, 9, 11, 12, 13: every caller passes an object with at least `kind` and `slug`, which all of `ResourceDetailView`'s `resource` prop, the admin `resource`/`r` Prisma objects, and `SerializedResource`/`ResourceWithCountry`/`Result` (after their `slug` additions in Task 13) satisfy structurally. `fetchPublishedResourceBySlug`'s return type (Task 5) matches what `ResourceDetailView` expects (`Resource & { country: Country; city: City | null }`, Task 6) exactly, since both come from the same `include: { country: true, city: true }` shape.
- **Deployment risk flagged explicitly:** Task 2's note and Task 14 Step 7 both call out that the production backfill must run before the `NOT NULL` migration deploys, since this plan only executes against the local dev database (no `DATABASE_URL` access to production from this machine, consistent with prior sessions' notes in project memory).
