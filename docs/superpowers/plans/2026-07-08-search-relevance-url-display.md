# Relevancia en búsqueda + dominio visible en tarjetas Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make search results rank by relevance (name > notes, visitor's locale > other locales) instead of purely by creation date, and show the linked domain as a small subtitle in every card that lists a resource (country/category listings, `/buscar`, and the header's quick-search overlay).

**Architecture:** Extract the duplicated search query (today split almost identically between `app/api/search/route.ts` and `app/[locale]/buscar/page.tsx`) into a single `lib/search.ts#searchResources()`, which applies a new pure ranking function (`lib/search-rank.ts#rankSearchResults()`) before returning. Add a compact `urlHost()` helper next to the existing `cleanUrlDisplay()` in `lib/format-url.ts`, and use it in the three components that render a resource row: `ResourceLink`, `SearchResultLink`, and `SearchOverlay`'s internal `ResultRow`.

**Tech Stack:** Next.js 16 App Router (Server Components + Route Handlers), TypeScript, Prisma, Tailwind v4, Vitest.

## Global Constraints

- `tsc --noEmit` must stay clean and `vitest run` (full suite) must pass after every task.
- No new dependencies.
- Spanish/multi-locale UI copy — no new user-facing strings are needed for this feature (the domain subtitle has no label, just the bare host).
- Do NOT consolidate `ResourceLink`/`SearchResultLink`/`SearchOverlay`'s `ResultRow` into one shared component — that is explicitly out of scope for this plan (next session).

---

### Task 1: `urlHost()` helper

**Files:**
- Modify: `lib/format-url.ts`
- Test: `tests/lib/format-url.test.ts` (new)

**Interfaces:**
- Produces: `urlHost(url: string): string` — bare hostname (no `www.`, no path/query/hash), for compact card display. Sits next to the existing `cleanUrlDisplay(url: string): string` (host + path, used only by the resource detail page — untouched by this plan).

- [ ] **Step 1: Write the failing test**

Create `tests/lib/format-url.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { urlHost } from '@/lib/format-url'

describe('urlHost', () => {
  it('returns the bare hostname without protocol or path', () => {
    expect(urlHost('https://gofundme.com/f/emergency-relief-for-venezuela-earthquake-victims')).toBe('gofundme.com')
  })

  it('strips a leading www.', () => {
    expect(urlHost('https://www.acnur.org/donar')).toBe('acnur.org')
  })

  it('falls back to a best-effort strip for an unparseable URL', () => {
    expect(urlHost('not-a-real-url/path')).toBe('not-a-real-url')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/lib/format-url.test.ts`
Expected: FAIL — `urlHost is not exported` / `undefined is not a function`

- [ ] **Step 3: Add `urlHost` to `lib/format-url.ts`**

Replace the entire contents of `lib/format-url.ts` with:

```ts
/** Host + path for display, dropping query/hash (where tracking params like utm_ and fbclid live). */
export function cleanUrlDisplay(url: string): string {
  try {
    const u = new URL(url)
    const host = u.hostname.replace(/^www\./, '')
    const path = u.pathname === '/' ? '' : u.pathname
    const display = `${host}${path}`
    return display.length > 60 ? `${display.slice(0, 57)}…` : display
  } catch {
    return url.replace(/^https?:\/\//, '').replace(/\/$/, '')
  }
}

/** Bare hostname for compact card display (no path, no query/hash). */
export function urlHost(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url.replace(/^https?:\/\//, '').replace(/\/.*$/, '')
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/lib/format-url.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Full verification and commit**

Run: `npx tsc --noEmit` — expect clean.
Run: `npm test` — expect all existing tests still pass.

```bash
git add lib/format-url.ts tests/lib/format-url.test.ts
git commit -m "feat: add urlHost helper for compact domain display"
```

---

### Task 2: Relevance ranking (`lib/search-rank.ts`)

**Files:**
- Create: `lib/search-rank.ts`
- Test: `tests/lib/search-rank.test.ts`

**Interfaces:**
- Consumes: `localizeBare`, `localizeSuffixed` from `@/lib/locale-content` (existing — these already implement the "es lives in the bare column, other locales live in suffixed columns, fall back to es if empty" rule used everywhere else in the app, e.g. `getResourceName`).
- Produces: `rankSearchResults<T extends RankableResource>(results: T[], query: string, locale: string): T[]`, where `RankableResource = { name: string; nameEn: string | null; namePt: string | null; nameFr: string | null; nameDe: string | null; notesEs: string | null; notesEn: string | null; notesPt: string | null; notesFr: string | null; notesDe: string | null }`. Sorts by match tier (0 = best) using a **stable** sort — ties keep the input's relative order.

- [ ] **Step 1: Write the failing test**

Create `tests/lib/search-rank.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { rankSearchResults } from '@/lib/search-rank'

const base = {
  name: '',
  nameEn: null,
  namePt: null,
  nameFr: null,
  nameDe: null,
  notesEs: null,
  notesEn: null,
  notesPt: null,
  notesFr: null,
  notesDe: null,
}

describe('rankSearchResults', () => {
  it('ranks a name that starts with the query above one that only contains it', () => {
    const a = { ...base, id: 'a', name: 'Fundación Ayuda Venezuela' }
    const b = { ...base, id: 'b', name: 'Ayuda Venezuela Fundación' }
    const result = rankSearchResults([a, b], 'ayuda', 'es')
    expect(result.map((r) => r.id)).toEqual(['b', 'a'])
  })

  it('ranks a name match above a notes match', () => {
    const a = { ...base, id: 'a', name: 'ONG X', notesEs: 'campaña gofundme activa' }
    const b = { ...base, id: 'b', name: 'gofundme campaign' }
    const result = rankSearchResults([a, b], 'gofundme', 'es')
    expect(result.map((r) => r.id)).toEqual(['b', 'a'])
  })

  it("prioritizes a match in the visitor's locale over a match only visible in another locale", () => {
    const a = { ...base, id: 'a', name: 'X', nameFr: 'Fondation Venezuela' }
    const b = { ...base, id: 'b', name: 'Fundación Venezuela' }
    const result = rankSearchResults([a, b], 'venezuela', 'es')
    expect(result.map((r) => r.id)).toEqual(['b', 'a'])
  })

  it('still surfaces a match that only exists in a non-visitor locale column, below locale matches', () => {
    const a = { ...base, id: 'a', name: 'X', nameEn: 'GoFundMe Relief' }
    const result = rankSearchResults([a], 'gofundme', 'es')
    expect(result.map((r) => r.id)).toEqual(['a'])
  })

  it('preserves the original relative order for resources in the same tier', () => {
    const a = { ...base, id: 'a', name: 'ONG Alpha' }
    const b = { ...base, id: 'b', name: 'ONG Beta' }
    const result = rankSearchResults([a, b], 'ong', 'es')
    expect(result.map((r) => r.id)).toEqual(['a', 'b'])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/lib/search-rank.test.ts`
Expected: FAIL — `Cannot find module '@/lib/search-rank'`

- [ ] **Step 3: Create `lib/search-rank.ts`**

```ts
import { localizeBare, localizeSuffixed } from '@/lib/locale-content'

type RankableResource = {
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
}

/**
 * Match tier for one resource: 0 is the best match, 5 means the query didn't
 * hit any name/notes field directly (it only matched via a country-name
 * search, handled separately by the caller). Uses the same locale fallback
 * rules as the UI (localizeBare/localizeSuffixed) so "does this match what
 * the visitor actually sees" and "what's rendered" never disagree.
 */
function tierFor(resource: RankableResource, query: string, locale: string): number {
  const q = query.toLowerCase()

  const displayName = localizeBare(resource, 'name', locale).toLowerCase()
  if (displayName.startsWith(q)) return 0
  if (displayName.includes(q)) return 1

  const allNames = [resource.name, resource.nameEn, resource.namePt, resource.nameFr, resource.nameDe]
  if (allNames.some((n) => n?.toLowerCase().includes(q))) return 2

  const displayNotes = (localizeSuffixed(resource, 'notes', locale) ?? '').toLowerCase()
  if (displayNotes.includes(q)) return 3

  const allNotes = [resource.notesEs, resource.notesEn, resource.notesPt, resource.notesFr, resource.notesDe]
  if (allNotes.some((n) => n?.toLowerCase().includes(q))) return 4

  return 5
}

/** Sorts search results by relevance tier (best first); stable — ties keep their input order. */
export function rankSearchResults<T extends RankableResource>(
  results: T[],
  query: string,
  locale: string,
): T[] {
  return results
    .map((resource) => ({ resource, tier: tierFor(resource, query, locale) }))
    .sort((a, b) => a.tier - b.tier)
    .map((scored) => scored.resource)
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/lib/search-rank.test.ts`
Expected: PASS (5 tests)

- [ ] **Step 5: Full verification and commit**

Run: `npx tsc --noEmit` — expect clean.
Run: `npm test` — expect all tests pass.

```bash
git add lib/search-rank.ts tests/lib/search-rank.test.ts
git commit -m "feat: add relevance-based ranking for search results"
```

---

### Task 3: Centralize the search query in `lib/search.ts`, wire into `/api/search`

**Files:**
- Create: `lib/search.ts`
- Modify: `app/api/search/route.ts`

**Interfaces:**
- Consumes: `rankSearchResults` from `@/lib/search-rank` (Task 2); `isCountryVisibleInLocale` from `@/lib/locale-content`; `notPastEventFilter` from `@/lib/resource-visibility`; `prisma` from `@/lib/prisma`.
- Produces: `searchResources({ query, locale }: { query: string; locale: string }): Promise<{ results: Resource[]; fallback: Resource[]; countries: Country[] }>`, where each `Resource` carries `url` (new — neither of the two pre-existing selects fetched it) plus every field the old `RESOURCE_SELECT`/`GLOBAL_SELECT` already fetched.

No automated test for this file: it's a thin DB-query orchestrator (same category as `lib/resource-review.ts#fetchResourcesByIds`, which also has no direct unit test) — the ranking logic it calls is already covered by Task 2, and the query itself is verified in Task 8's manual pass.

- [ ] **Step 1: Create `lib/search.ts`**

```ts
import { prisma } from '@/lib/prisma'
import { ResourceStatus } from '@prisma/client'
import { isCountryVisibleInLocale } from '@/lib/locale-content'
import { notPastEventFilter } from '@/lib/resource-visibility'
import { rankSearchResults } from '@/lib/search-rank'

const RESOURCE_SELECT = {
  id: true,
  name: true,
  nameEn: true,
  namePt: true,
  nameFr: true,
  nameDe: true,
  category: true,
  countrySlug: true,
  kind: true,
  eventStartsAt: true,
  eventEndsAt: true,
  notesEs: true,
  notesEn: true,
  notesPt: true,
  notesFr: true,
  notesDe: true,
  url: true,
  country: {
    select: {
      nameEs: true, nameEn: true, namePt: true, nameFr: true, nameDe: true, flag: true, cca2: true,
      enabledLocales: true,
    },
  },
  city: {
    select: { slug: true, nameEs: true, nameEn: true, namePt: true, nameFr: true, nameDe: true },
  },
} as const

async function findMatchingCountries(query: string, locale: string) {
  const countries = await prisma.country.findMany({
    where: {
      active: true,
      OR: [
        { nameEs: { contains: query, mode: 'insensitive' } },
        { nameEn: { contains: query, mode: 'insensitive' } },
        { namePt: { contains: query, mode: 'insensitive' } },
        { nameFr: { contains: query, mode: 'insensitive' } },
        { nameDe: { contains: query, mode: 'insensitive' } },
      ],
    },
    select: {
      slug: true,
      nameEs: true, nameEn: true, namePt: true, nameFr: true, nameDe: true, cca2: true,
      enabledLocales: true,
    },
  })
  return countries.filter((c) => isCountryVisibleInLocale(c.enabledLocales, locale))
}

async function findMatchingResources(query: string, countrySlugs: string[]) {
  const rawResults = await prisma.resource.findMany({
    where: {
      status: ResourceStatus.PUBLISHED,
      AND: [
        notPastEventFilter(),
        {
          OR: [
            { name: { contains: query, mode: 'insensitive' } },
            { nameEn: { contains: query, mode: 'insensitive' } },
            { namePt: { contains: query, mode: 'insensitive' } },
            { nameFr: { contains: query, mode: 'insensitive' } },
            { nameDe: { contains: query, mode: 'insensitive' } },
            { notesEs: { contains: query, mode: 'insensitive' } },
            { notesEn: { contains: query, mode: 'insensitive' } },
            { notesPt: { contains: query, mode: 'insensitive' } },
            { notesFr: { contains: query, mode: 'insensitive' } },
            { notesDe: { contains: query, mode: 'insensitive' } },
            ...(countrySlugs.length > 0 ? [{ countrySlug: { in: countrySlugs } }] : []),
          ],
        },
      ],
    },
    select: RESOURCE_SELECT,
    orderBy: { createdAt: 'asc' },
    take: 100,
  })
  return rawResults
}

/**
 * Single source of truth for resource search: query + relevance ranking +
 * the "no results → show global resources instead" fallback. Used by both
 * `/api/search` (the header's quick-search overlay) and `/buscar` (the full
 * search page) so a future change to ranking or filtering only has to
 * happen once.
 */
export async function searchResources({ query, locale }: { query: string; locale: string }) {
  if (query.length < 2) {
    return { results: [], fallback: [], countries: [] }
  }

  const matchingCountries = await findMatchingCountries(query, locale)
  const countrySlugs = matchingCountries.map((c) => c.slug)

  const rawResults = await findMatchingResources(query, countrySlugs)
  // A resource whose country page 404s in this locale shouldn't surface in
  // search either — it would be a dead end with no way back to its country.
  const visibleResults = rawResults.filter((r) => isCountryVisibleInLocale(r.country.enabledLocales, locale))
  const results = rankSearchResults(visibleResults, query, locale)

  let fallback: typeof results = []
  if (results.length === 0) {
    const rawFallback = await prisma.resource.findMany({
      where: { status: ResourceStatus.PUBLISHED, countrySlug: 'global', ...notPastEventFilter() },
      select: RESOURCE_SELECT,
      orderBy: { createdAt: 'asc' },
      take: 50,
    })
    const visibleFallback = rawFallback.filter((r) => isCountryVisibleInLocale(r.country.enabledLocales, locale))
    fallback = rankSearchResults(visibleFallback, query, locale)
  }

  return { results, fallback, countries: matchingCountries }
}
```

- [ ] **Step 2: Replace `app/api/search/route.ts` to use it**

Replace the entire contents of `app/api/search/route.ts` with:

```ts
import { searchResources } from '@/lib/search'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const q = (searchParams.get('q')?.trim() ?? '').slice(0, 100)
  const locale = searchParams.get('locale') ?? 'es'

  const { results, fallback, countries } = await searchResources({ query: q, locale })
  return Response.json({ results, fallback, countries })
}
```

- [ ] **Step 3: Verify it compiles**

Run: `npx tsc --noEmit` — expect clean.
Run: `npm test` — expect all tests pass.

- [ ] **Step 4: Commit**

```bash
git add lib/search.ts app/api/search/route.ts
git commit -m "refactor: centralize search query + ranking into lib/search.ts"
```

---

### Task 4: Wire `/buscar` to `searchResources`

**Files:**
- Modify: `app/[locale]/buscar/page.tsx`

**Interfaces:**
- Consumes: `searchResources` from `@/lib/search` (Task 3).

- [ ] **Step 1: Replace the file contents**

Replace the entire contents of `app/[locale]/buscar/page.tsx` with:

```tsx
import Link from 'next/link'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { ResourceCategory } from '@prisma/client'
import { SearchResultLink } from '@/components/SearchResultLink'
import { SearchInput } from '@/components/SearchInput'
import { Users, Heart, ArrowLeftRight, Phone, Package, Globe, Landmark, Brain, type LucideIcon } from 'lucide-react'
import { localizeSuffixed } from '@/lib/locale-content'
import { searchResources } from '@/lib/search'
import type { Metadata } from 'next'

const CATEGORY_ORDER: ResourceCategory[] = [
  'DONATE_PHYSICALLY',
  'DONATE_MONEY',
  'FIND_FAMILY',
  'CALL_FREE',
  'SEND_MONEY',
  'DIGITAL_BRIDGE',
  'CONSULAR',
  'MENTAL_HEALTH',
]

const CATEGORY_ICONS: Record<ResourceCategory, LucideIcon> = {
  FIND_FAMILY: Users,
  DONATE_MONEY: Heart,
  SEND_MONEY: ArrowLeftRight,
  CALL_FREE: Phone,
  DONATE_PHYSICALLY: Package,
  DIGITAL_BRIDGE: Globe,
  CONSULAR: Landmark,
  MENTAL_HEALTH: Brain,
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ q?: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const { q = '' } = await searchParams
  const query = q.trim().slice(0, 100)

  const t = await getTranslations({ locale, namespace: 'search' })
  const openGraph: Metadata['openGraph'] = {
    type: 'website',
    siteName: 'VEconecta',
    images: [{ url: `/api/og?locale=${locale}`, width: 1200, height: 630 }],
  }
  if (!query) {
    return { title: `${t('title')} | VEconecta`, openGraph }
  }
  return { title: `"${query}" — ${t('title')} | VEconecta`, openGraph }
}

export default async function SearchPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ q?: string }>
}) {
  const { locale } = await params
  const { q = '' } = await searchParams
  setRequestLocale(locale)

  const query = q.trim().slice(0, 100)

  const [tNav, tCat, tSearch] = await Promise.all([
    getTranslations('nav'),
    getTranslations('categories'),
    getTranslations('search'),
  ])

  const { results, fallback, countries: matchingCountries } = await searchResources({ query, locale })

  const byCategory = CATEGORY_ORDER.reduce(
    (acc, cat) => {
      acc[cat] = results.filter((r) => r.category === cat)
      return acc
    },
    {} as Record<ResourceCategory, typeof results>,
  )

  const total = results.length

  const placeholder = tSearch('placeholder')
  const resultsText = tSearch('resultsCount', { count: total, query })
  const searchLabel = tSearch('title')

  return (
    <main className="min-h-screen bg-white">
      {/* Breadcrumb */}
      <div className="bg-coco h-10 flex items-center px-5 gap-1.5">
        <Link
          href={`/${locale}`}
          className="font-sans font-normal text-sm text-caribe hover:underline shrink-0"
        >
          {tNav('home')}
        </Link>
        <span className="font-sans text-sm text-[#b8b8b8] shrink-0">›</span>
        <span className="font-sans font-normal text-sm text-[#141414] shrink-0">{searchLabel}</span>
      </div>

      {/* Search bar */}
      <div className="px-5 py-4 border-b border-[rgba(20,20,20,0.08)]">
        <SearchInput placeholder={placeholder} defaultValue={query} locale={locale} />
      </div>

      {/* Status */}
      {query.length >= 2 && total > 0 && (
        <div className="px-5 py-3">
          <p className="font-sans font-light text-[13px] text-[#808080]">{resultsText}</p>
        </div>
      )}

      {query.length < 2 && (
        <div className="px-5 py-10 text-center">
          <p className="font-sans font-light text-[15px] text-[#808080]">
            {tSearch('typeHint')}
          </p>
        </div>
      )}

      {/* Países encontrados */}
      {matchingCountries.length > 0 && matchingCountries.map(c => {
        const name = localizeSuffixed(c, 'name', locale) ?? c.nameEs
        const flagSrc = c.cca2 ? `https://flagcdn.com/w40/${c.cca2}.png` : null
        return (
          <div key={c.slug}>
            <div className="h-px bg-[rgba(20,20,20,0.12)]" />
            <Link
              href={`/${locale}/${c.slug}`}
              className="flex items-center gap-3 h-14 px-5 hover:bg-guacamaya/5 transition-colors"
            >
              {flagSrc && <img src={flagSrc} width={24} height={16} alt="" className="object-cover rounded-[2px] shrink-0" />}
              <span className="font-sans font-semibold text-base text-[#141414]">{name}</span>
              <span className="ml-auto text-[#b8b8b8] text-base shrink-0 select-none">›</span>
            </Link>
          </div>
        )
      })}

      {/* Results by category */}
      {total > 0 && CATEGORY_ORDER.map((cat) => {
        const catResults = byCategory[cat]
        if (catResults.length === 0) return null
        const Icon = CATEGORY_ICONS[cat]

        return (
          <div key={cat}>
            <div className="h-px bg-[rgba(20,20,20,0.12)]" />
            <div className="flex items-center gap-3.5 h-14 px-5">
              <div className="w-9 h-9 rounded-full bg-coco flex items-center justify-center shrink-0">
                <Icon className="w-[18px] h-[18px] text-[#184e68]" strokeWidth={1.5} />
              </div>
              <span className="font-sans font-semibold text-base text-[#141414]">
                {tCat(cat)}
              </span>
              <span className="font-sans text-[12px] font-semibold text-caribe bg-caribe/10 rounded-full px-2 py-0.5 leading-none">
                {catResults.length}
              </span>
            </div>
            {catResults.map((r) => (
              <SearchResultLink key={r.id} resource={r} locale={locale} />
            ))}
          </div>
        )
      })}

      {total > 0 && <div className="h-px bg-[rgba(20,20,20,0.12)]" />}

      {/* Fallback: globales cuando no hay resultados */}
      {fallback.length > 0 && (
        <>
          <div className="px-5 py-3">
            <p className="font-sans font-light text-[13px] text-[#808080]">
              {tSearch('fallbackIntro', { query })}
            </p>
          </div>
          <div className="px-5 pt-4 pb-6 flex justify-center">
            <div className="flex items-center gap-3">
              <Globe className="w-[22px] h-[22px] text-[#184e68]" strokeWidth={1.5} />
              <span className="font-display font-bold text-[22px] text-[#141414]">{tSearch('international')}</span>
            </div>
          </div>
          {fallback.map((r) => (
            <SearchResultLink key={r.id} resource={r} locale={locale} />
          ))}
          <div className="h-px bg-[rgba(20,20,20,0.12)]" />
        </>
      )}
    </main>
  )
}
```

Note what changed vs. the original: removed the local `GLOBAL_SELECT` constant and the duplicated `matchingCountries`/`rawResults`/`fallback` Prisma calls (now all inside `searchResources`), removed now-unused imports (`prisma`, `ResourceStatus`, `isCountryVisibleInLocale`, `notPastEventFilter`), kept `ResourceCategory` (still used for `CATEGORY_ORDER`/`CATEGORY_ICONS` typing) and `localizeSuffixed` (still used for the "Países encontrados" block).

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit` — expect clean.
Run: `npm test` — expect all tests pass.

- [ ] **Step 3: Commit**

```bash
git add "app/[locale]/buscar/page.tsx"
git commit -m "refactor: use shared searchResources on the /buscar page"
```

---

### Task 5: Show the domain in `ResourceLink` (country/category listings)

**Files:**
- Modify: `components/ResourceLink.tsx`

**Interfaces:**
- Consumes: `urlHost` from `@/lib/format-url` (Task 1). `SerializedResource` (from `@/lib/types`, unchanged) already has a `url: string | null` field, so no type change is needed here.

No automated test for this component (no existing test file for it, and this is a one-line conditional JSX addition around an already-tested helper) — verified visually in Task 8.

- [ ] **Step 1: Add the import and the domain line**

In `components/ResourceLink.tsx`, add the import alongside the existing ones near the top:

```tsx
import { urlHost } from '@/lib/format-url'
```

Then, in the JSX, insert a new block right after the name `<p>` and before the `{notes && (...)}` block (i.e. between the closing `</p>` of the name and the `{notes && (`):

```tsx
        {resource.url && (
          <p className="font-sans font-light text-[12px] text-[#808080] mt-0.5">
            {urlHost(resource.url)}
          </p>
        )}
```

The surrounding block should read:

```tsx
      <div className="flex-1 min-w-0 pointer-events-none">
        <p className="font-sans font-normal text-[15px] text-[#141414] leading-snug">
          {name}
        </p>
        {resource.url && (
          <p className="font-sans font-light text-[12px] text-[#808080] mt-0.5">
            {urlHost(resource.url)}
          </p>
        )}
        {notes && (
          <p className="font-sans font-light text-[13px] text-[#808080] mt-0.5 leading-snug line-clamp-1">
            {notes}
          </p>
        )}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit` — expect clean.

- [ ] **Step 3: Commit**

```bash
git add components/ResourceLink.tsx
git commit -m "feat: show the linked domain in country/category resource lists"
```

---

### Task 6: Show the domain in `SearchResultLink` (`/buscar` results)

**Files:**
- Modify: `components/SearchResultLink.tsx`

**Interfaces:**
- Consumes: `urlHost` from `@/lib/format-url` (Task 1).
- The local `ResourceWithCountry` type gains `url: string | null` — the objects flowing into this component now come from `searchResources()` (Task 3/4), whose `RESOURCE_SELECT` includes `url`, so the data is already there; only the type needs updating.

No automated test for this component — verified visually in Task 8.

- [ ] **Step 1: Add `url` to the prop type and the import**

In `components/SearchResultLink.tsx`, update the `ResourceWithCountry` type (currently):

```tsx
type ResourceWithCountry = {
  id: string
  name: string
  countrySlug: string
  kind: ResourceKind
  eventStartsAt: Date | null
  eventEndsAt: Date | null
  country: {
    nameEs: string
    cca2: string | null
  }
  city: SerializedCity | null
}
```

to:

```tsx
type ResourceWithCountry = {
  id: string
  name: string
  url: string | null
  countrySlug: string
  kind: ResourceKind
  eventStartsAt: Date | null
  eventEndsAt: Date | null
  country: {
    nameEs: string
    cca2: string | null
  }
  city: SerializedCity | null
}
```

Add the import alongside the existing ones:

```tsx
import { urlHost } from '@/lib/format-url'
```

- [ ] **Step 2: Insert the domain line**

Insert the same block used in Task 5, right after the name `<p>` and before the `{notes && (...)}` block:

```tsx
        {resource.url && (
          <p className="font-sans font-light text-[12px] text-[#808080] mt-0.5">
            {urlHost(resource.url)}
          </p>
        )}
```

The surrounding block should read:

```tsx
      <div className="flex-1 min-w-0 pointer-events-none">
        <p className="font-sans font-normal text-[15px] text-[#141414] leading-snug">
          {name}
        </p>
        {resource.url && (
          <p className="font-sans font-light text-[12px] text-[#808080] mt-0.5">
            {urlHost(resource.url)}
          </p>
        )}
        {notes && (
          <p className="font-sans font-light text-[13px] text-[#808080] mt-0.5 leading-snug line-clamp-1">
            {notes}
          </p>
        )}
```

- [ ] **Step 3: Verify it compiles**

Run: `npx tsc --noEmit` — expect clean (this will also confirm `results`/`fallback` from `searchResources()` are structurally compatible with the updated `ResourceWithCountry` type, since both now require `url`).

- [ ] **Step 4: Commit**

```bash
git add components/SearchResultLink.tsx
git commit -m "feat: show the linked domain in /buscar search results"
```

---

### Task 7: Show the domain in `SearchOverlay`'s `ResultRow` (header quick-search)

**Files:**
- Modify: `components/SearchOverlay.tsx`

**Interfaces:**
- Consumes: `urlHost` from `@/lib/format-url` (Task 1).
- The local `Result` type gains `url: string | null` — `SearchOverlay` fetches JSON from `/api/search` (Task 3), whose response now includes `url` on every result, but this component's `Result` type is hand-maintained (not derived from a shared type) and must be updated manually.

No automated test for this component — verified visually in Task 8.

- [ ] **Step 1: Add `url` to the `Result` type and the import**

In `components/SearchOverlay.tsx`, update the `Result` type (currently):

```tsx
type Result = {
  id: string
  name: string
  category: ResourceCategory
  countrySlug: string
  kind: ResourceKind
  eventStartsAt: string | null
  eventEndsAt: string | null
  country: {
    nameEs: string
    flag: string
    cca2: string | null
  }
  city: SerializedCity | null
}
```

to:

```tsx
type Result = {
  id: string
  name: string
  url: string | null
  category: ResourceCategory
  countrySlug: string
  kind: ResourceKind
  eventStartsAt: string | null
  eventEndsAt: string | null
  country: {
    nameEs: string
    flag: string
    cca2: string | null
  }
  city: SerializedCity | null
}
```

Add the import alongside the existing ones:

```tsx
import { urlHost } from '@/lib/format-url'
```

- [ ] **Step 2: Insert the domain line in `ResultRow`**

Insert the same block, right after the name `<p>` and before the `{notes && (...)}` block inside `ResultRow`:

```tsx
        {result.url && (
          <p className="font-sans font-light text-[12px] text-[#808080] mt-0.5">
            {urlHost(result.url)}
          </p>
        )}
```

The surrounding block should read:

```tsx
      <div className="flex-1 min-w-0 pointer-events-none">
        <p className="font-sans font-normal text-[15px] text-[#141414] leading-snug">{name}</p>
        {result.url && (
          <p className="font-sans font-light text-[12px] text-[#808080] mt-0.5">
            {urlHost(result.url)}
          </p>
        )}
        {notes && (
          <p className="font-sans font-light text-[13px] text-[#808080] mt-0.5 leading-snug line-clamp-1">{notes}</p>
        )}
```

- [ ] **Step 3: Verify it compiles**

Run: `npx tsc --noEmit` — expect clean.
Run: `npm test` — expect all tests pass.

- [ ] **Step 4: Commit**

```bash
git add components/SearchOverlay.tsx
git commit -m "feat: show the linked domain in the header quick-search overlay"
```

---

### Task 8: End-to-end verification and memory update

**Files:** none (manual verification + memory update only)

- [ ] **Step 1: Start the dev server**

Run: `npm run dev` (background). If port 3000 is already taken by another session's dev server (has happened before in this repo — see project memory on concurrent sessions), just verify against that same server; don't kill it.

- [ ] **Step 2: Verify ranking on `/buscar`**

Search for a term that appears in a resource's name (e.g. part of "I Love Venezuela Foundation" or "GoFundMe") and confirm that resource now appears first (or highest) within its category, ahead of resources where the term only appears in notes or in another language's fields. Compare against the pre-fix behavior if useful (creation-date order).

Also test: a query that only matches an other-locale field (e.g. a term only present in `nameFr`/`notesFr` for some resource, not in the Spanish fields) still surfaces that resource, just ranked below any Spanish-language matches — confirms tier 2/4 fallback works, not just the happy path.

- [ ] **Step 3: Verify ranking via the header quick-search overlay**

Same checks as Step 2, but through the header's `SearchOverlay` (which hits `/api/search` directly), on both desktop and the mobile tab variant if easy to check.

- [ ] **Step 4: Verify the domain shows in all three card contexts**

- A country page (e.g. `/es/spain`): resource cards should show the domain under the name for any resource with a `url`, and show nothing extra for resources without one.
- `/es/buscar?q=...`: same check on search result rows.
- Header quick-search overlay: same check.

- [ ] **Step 5: Run the full verification suite one more time**

Run: `npx tsc --noEmit` — expect clean.
Run: `npm test` — expect all tests pass.

- [ ] **Step 6: Update project memory**

Update `project-veconecta.md` in the memory directory with a new dated section summarizing: the relevance-ranking algorithm (tiers, locale priority), the `lib/search.ts` consolidation (and that `/api/search` and `/buscar` no longer have separate duplicated queries), the `urlHost` addition and where it's used, and the explicit note that `ResourceLink`/`SearchResultLink`/`SearchOverlay`'s `ResultRow` are still three separate components by design — that consolidation is the next planned session.

---

## Self-Review Notes

- **Spec coverage:** "Ranking por niveles" → Task 2 (tiers 0-5, locale priority via `localizeBare`/`localizeSuffixed` reuse) + Task 3 (`searchResources` calls it on both `results` and `fallback`). "Centralizar la query duplicada" → Task 3 (`lib/search.ts`) + Task 4 (`/buscar` now calls it instead of its own Prisma queries). "Dominio visible... en las 3 vistas" → Tasks 5/6/7 (`ResourceLink`, `SearchResultLink`, `SearchOverlay`'s `ResultRow`). "url agregado al select" → Task 3's `RESOURCE_SELECT`. "Fuera de alcance: fusión de los 3 componentes" → not touched by any task, explicitly called out in Tasks 5-7 and the Global Constraints.
- **Placeholder scan:** none found — every step has literal file contents or exact commands.
- **Type consistency:** `rankSearchResults<T extends RankableResource>` (Task 2) is called with the same shape of Prisma resource objects in Task 3's `searchResources`, which matches `RESOURCE_SELECT`'s fields (`name`, `nameEn`/`Pt`/`Fr`/`De`, `notesEs`/`En`/`Pt`/`Fr`/`De` all present). `urlHost(url: string)` (Task 1) is called consistently as `urlHost(resource.url)`/`urlHost(result.url)` only inside `resource.url && (...)`/`result.url && (...)` guards in Tasks 5-7, so it never receives `null`. `ResourceWithCountry.url` (Task 6) and `Result.url` (Task 7) are both typed `string | null`, matching `SerializedResource`'s existing `url: string | null` (from the Prisma `Resource` model) and the new `RESOURCE_SELECT.url` field in `lib/search.ts`.
