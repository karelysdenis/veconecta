# Sección "Próximos eventos" en la página de país: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show a chronological "Próximos eventos" agenda on the country page, above the category list, listing only that country's own events (`kind: EVENT`), separate from (but not replacing) their existing appearance inside category cards.

**Architecture:** No schema or query changes. Reuse the `country.resources` array that `CountryPage` already fetches (already filtered to `PUBLISHED` + non-past events, already includes `city`). Filter/sort that array in memory into a new `upcomingEvents` list, and render it through a new presentational component (`UpcomingEvents` + `EventAgendaRow`) inserted before the existing `CATEGORY_ORDER.map(...)` block. A new date-formatting helper (`formatEventBadge`) lives next to the existing `formatEventRange` in `lib/locale-content.ts`.

**Tech Stack:** Next.js App Router (Server Components), next-intl for i18n, Tailwind for styling, Vitest for unit tests.

## Global Constraints

- Public-facing copy must use "iniciativas", never "recursos", as the general term for what the site lists (per project convention). This feature is specifically about events (`kind: EVENT`), so the word "eventos" is fine here (it already appears in the admin UI as the kind label), but do not use "recursos" anywhere in new copy or comments.
- No red backgrounds anywhere in public-facing visual elements.
- All Spanish-language prose in code comments, commit messages, and docs must avoid the em dash (—) as an explanatory aside or parenthetical enumeration; use colons, commas, "y"/"pero", or separate sentences instead.
- Only the `hasCitySelector === false` branch of `CountryPage` is in scope. Do not modify the `CityList` branch.
- Events with `kind: EVENT` but no `eventStartsAt` set are excluded from the new agenda section (nothing to sort/display), but must keep appearing unchanged inside their category card.
- Only country-owned events (`countrySlug` of that country) appear in the new section; `global`-scoped resources are excluded from it even if `kind: EVENT`.

---

### Task 1: `formatEventBadge` helper + tests

**Files:**
- Modify: `lib/locale-content.ts` (add function, after `formatEventRange` at line 59)
- Test: `tests/lib/locale-content.test.ts` (new file)

**Interfaces:**
- Produces: `formatEventBadge(startIso: string, locale: Locale): { day: string; month: string }`, used by Task 3 (`EventAgendaRow`).

- [ ] **Step 1: Write the failing tests**

Create `tests/lib/locale-content.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { formatEventBadge } from '@/lib/locale-content'

describe('formatEventBadge', () => {
  it('formats day and abbreviated month in Spanish', () => {
    const result = formatEventBadge('2026-07-14T00:00:00.000Z', 'es')
    expect(result.day).toBe('14')
    expect(result.month.toLowerCase()).toContain('jul')
  })

  it('formats day and abbreviated month in English', () => {
    const result = formatEventBadge('2026-07-14T00:00:00.000Z', 'en')
    expect(result.day).toBe('14')
    expect(result.month.toLowerCase()).toContain('jul')
  })

  it('pads nothing for single-digit days (Intl gives unpadded numeric day)', () => {
    const result = formatEventBadge('2026-07-05T00:00:00.000Z', 'es')
    expect(result.day).toBe('5')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/lib/locale-content.test.ts`
Expected: FAIL with `formatEventBadge is not exported` (or similar import error).

- [ ] **Step 3: Implement `formatEventBadge`**

In `lib/locale-content.ts`, immediately after the closing brace of `formatEventRange` (currently ending at line 59), add:

```ts
/** { day: "14", month: "jul" } for the event date badge, formatted in the given locale. */
export function formatEventBadge(startIso: string, locale: Locale): { day: string; month: string } {
  const date = new Date(startIso)
  const day = new Intl.DateTimeFormat(INTL_LOCALE[locale], { day: 'numeric' }).format(date)
  const month = new Intl.DateTimeFormat(INTL_LOCALE[locale], { month: 'short' }).format(date)
  return { day, month }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/lib/locale-content.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/locale-content.ts tests/lib/locale-content.test.ts
git commit -m "feat: add formatEventBadge helper for event date chips"
```

---

### Task 2: Translation key `country.upcomingEvents`

**Files:**
- Modify: `messages/es.json` (`country` block, currently lines 57-62)
- Modify: `messages/en.json` (`country` block, currently lines 57-62)
- Modify: `messages/pt.json` (`country` block, currently lines 57-62)
- Modify: `messages/fr.json` (`country` block, currently lines 57-62)
- Modify: `messages/de.json` (`country` block, currently lines 57-62)

**Interfaces:**
- Produces: translation key `country.upcomingEvents`, consumed by Task 3 (`UpcomingEvents` component) via `useTranslations('country')`.

- [ ] **Step 1: Add the key to all 5 locale files**

In `messages/es.json`, inside the `"country"` object, add a new entry (keep existing keys and their order, add this one at the end of the block):

```json
  "country": {
    "lastUpdated": "Actualizado: {date}",
    "noResources": "Iniciativas en preparación — vuelve pronto.",
    "fromCountry": "Desde {name}",
    "whatYouCanDo": "Esto es lo que puedes hacer ahora mismo:",
    "upcomingEvents": "Próximos eventos"
  },
```

In `messages/en.json`:

```json
  "country": {
    "lastUpdated": "Updated: {date}",
    "noResources": "Initiatives in preparation — check back soon.",
    "fromCountry": "From {name}",
    "whatYouCanDo": "Here's what you can do right now:",
    "upcomingEvents": "Upcoming events"
  },
```

In `messages/pt.json`:

```json
  "country": {
    "lastUpdated": "Atualizado: {date}",
    "noResources": "Iniciativas em preparação — volte em breve.",
    "fromCountry": "De {name}",
    "whatYouCanDo": "Isto é o que você pode fazer agora mesmo:",
    "upcomingEvents": "Próximos eventos"
  },
```

In `messages/fr.json`:

```json
  "country": {
    "lastUpdated": "Mis à jour : {date}",
    "noResources": "Initiatives en préparation — revenez bientôt.",
    "fromCountry": "Depuis {name}",
    "whatYouCanDo": "Voici ce que vous pouvez faire dès maintenant :",
    "upcomingEvents": "Événements à venir"
  },
```

In `messages/de.json`:

```json
  "country": {
    "lastUpdated": "Aktualisiert: {date}",
    "noResources": "Initiativen in Vorbereitung — schau bald wieder vorbei.",
    "fromCountry": "Von {name}",
    "whatYouCanDo": "Das kannst du jetzt sofort tun:",
    "upcomingEvents": "Anstehende Veranstaltungen"
  },
```

Note: the existing em dashes in `noResources` (already-committed copy, not written by this plan) are left as-is; this task only adds the new `upcomingEvents` key and does not rewrite existing strings.

- [ ] **Step 2: Verify all 5 files are still valid JSON**

Run: `node -e "['es','en','pt','fr','de'].forEach(l => JSON.parse(require('fs').readFileSync('messages/'+l+'.json','utf8')))"`
Expected: no output, exit code 0 (throws and prints a stack trace if any file has invalid JSON).

- [ ] **Step 3: Commit**

```bash
git add messages/es.json messages/en.json messages/pt.json messages/fr.json messages/de.json
git commit -m "feat: add country.upcomingEvents translation key"
```

---

### Task 3: `UpcomingEvents` + `EventAgendaRow` components

**Files:**
- Create: `components/UpcomingEvents.tsx`
- Test: `tests/components/UpcomingEvents.test.tsx` (new file)

**Interfaces:**
- Consumes: `SerializedResource` type and `getResourceName` from `lib/types.ts`; `localizeSuffixed`, `formatEventRange`, `formatEventBadge`, `INTL_LOCALE`, `Locale` from `lib/locale-content.ts`; `resourceCanonicalPath` from `lib/resource-detail.ts`.
- Produces: `UpcomingEvents({ events: SerializedResource[], locale: Locale })` React component, consumed by Task 4 (`CountryPage`).

This codebase's existing pattern for testing a component that calls `useTranslations` (see `tests/components/LangPopover.test.tsx:12-15`) is `vi.mock('next-intl', ...)` with `useTranslations` replaced by a per-namespace lookup function, not `NextIntlClientProvider`. `UpcomingEvents` is written as a client component in Step 3 below specifically so this same pattern applies (it matches how `ActionCard.tsx` and `ResourceLink.tsx`, the two closest existing components, already work: `'use client'` + `useTranslations`).

- [ ] **Step 1: Write the failing tests**

Create `tests/components/UpcomingEvents.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { UpcomingEvents } from '@/components/UpcomingEvents'
import type { SerializedResource } from '@/lib/types'

const messages: Record<string, Record<string, string>> = {
  country: { upcomingEvents: 'Próximos eventos' },
  categories: { DONATE_PHYSICALLY: 'Donar físicamente' },
}

vi.mock('next-intl', () => ({
  useTranslations: (namespace: string) => (key: string) => messages[namespace]?.[key] ?? key,
}))

function baseEvent(overrides: Partial<SerializedResource> = {}): SerializedResource {
  return {
    id: 'ev1',
    countrySlug: 'spain',
    category: 'DONATE_PHYSICALLY',
    name: 'Colecta solidaria',
    slug: 'colecta-solidaria',
    nameEn: null,
    namePt: null,
    nameFr: null,
    nameDe: null,
    cityId: null,
    city: null,
    url: null,
    phone: null,
    paymentKey: null,
    address: null,
    schedule: null,
    free: false,
    notesEs: null,
    notesEn: null,
    notesPt: null,
    notesFr: null,
    notesDe: null,
    status: 'PUBLISHED',
    verifiedAt: null,
    verifiedBy: null,
    validUntil: null,
    kind: 'EVENT',
    eventStartsAt: '2026-07-14T00:00:00.000Z',
    eventEndsAt: '2026-07-14T00:00:00.000Z',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

describe('UpcomingEvents', () => {
  it('renders nothing when there are no events', () => {
    const { container } = render(<UpcomingEvents events={[]} locale="es" />)
    expect(container).toBeEmptyDOMElement()
  })

  it('renders the section heading and event name when there is at least one event', () => {
    render(<UpcomingEvents events={[baseEvent()]} locale="es" />)
    expect(screen.getByText('Próximos eventos')).toBeInTheDocument()
    expect(screen.getByText('Colecta solidaria')).toBeInTheDocument()
  })

  it('renders one row per event, in the order given', () => {
    const events = [
      baseEvent({ id: 'ev1', name: 'Primero' }),
      baseEvent({ id: 'ev2', name: 'Segundo' }),
    ]
    render(<UpcomingEvents events={events} locale="es" />)
    const names = screen.getAllByText(/Primero|Segundo/).map((el) => el.textContent)
    expect(names).toEqual(['Primero', 'Segundo'])
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/components/UpcomingEvents.test.tsx`
Expected: FAIL with a module-not-found error for `@/components/UpcomingEvents`.

- [ ] **Step 3: Implement the component**

Create `components/UpcomingEvents.tsx`. It is a client component (`'use client'`), matching `ActionCard.tsx` and `ResourceLink.tsx`, both of which call `useTranslations` from `next-intl` rather than the server-only `getTranslations`:

```tsx
'use client'
import Link from 'next/link'
import { Calendar, MapPin } from 'lucide-react'
import { useTranslations } from 'next-intl'
import type { SerializedResource } from '@/lib/types'
import { getResourceName } from '@/lib/types'
import { localizeSuffixed, formatEventRange, formatEventBadge, type Locale } from '@/lib/locale-content'
import { resourceCanonicalPath } from '@/lib/resource-detail'

export function UpcomingEvents({
  events,
  locale,
}: {
  events: SerializedResource[]
  locale: Locale
}) {
  const tCountry = useTranslations('country')
  const tCategories = useTranslations('categories')

  if (events.length === 0) return null

  return (
    <div>
      <div className="h-px bg-[rgba(20,20,20,0.12)]" />
      <div className="px-5 pt-5 pb-1 flex items-center gap-2">
        <Calendar className="w-4 h-4 text-caribe" strokeWidth={2} />
        <h2 className="font-sans font-semibold text-base text-[#141414]">
          {tCountry('upcomingEvents')}
        </h2>
      </div>
      {events.map((r) => (
        <EventAgendaRow
          key={r.id}
          resource={r}
          locale={locale}
          categoryLabel={tCategories(r.category)}
        />
      ))}
    </div>
  )
}

function EventAgendaRow({
  resource,
  locale,
  categoryLabel,
}: {
  resource: SerializedResource
  locale: Locale
  categoryLabel: string
}) {
  const name = getResourceName(resource, locale)
  const { day, month } = formatEventBadge(resource.eventStartsAt as string, locale)
  const isMultiDay =
    resource.eventStartsAt &&
    resource.eventEndsAt &&
    new Date(resource.eventStartsAt).getTime() !== new Date(resource.eventEndsAt).getTime()
  const rangeStr = isMultiDay
    ? formatEventRange(resource.eventStartsAt, resource.eventEndsAt, locale)
    : null
  const cityName = resource.city
    ? (localizeSuffixed(resource.city, 'name', locale) ?? resource.city.nameEs)
    : null

  return (
    <div className="relative flex items-center gap-3 min-h-14 px-5 py-3 border-t border-[rgba(20,20,20,0.08)] hover:bg-guacamaya/5 transition-colors">
      <Link
        href={resourceCanonicalPath(resource, locale)}
        className="absolute inset-0"
        aria-label={name}
      />
      <div className="w-11 h-11 rounded-[10px] bg-caribe/10 text-caribe flex flex-col items-center justify-center shrink-0 leading-none pointer-events-none">
        <span className="text-base font-extrabold">{day}</span>
        <span className="text-[9px] font-bold uppercase">{month}</span>
      </div>
      <div className="flex-1 min-w-0 pointer-events-none">
        <p className="font-sans font-normal text-[15px] text-[#141414] leading-snug">{name}</p>
        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
          {cityName && (
            <span className="inline-flex items-center gap-1 font-sans font-medium text-[11px] text-caribe bg-caribe/10 rounded-full px-2 py-0.5">
              <MapPin size={11} strokeWidth={2.5} className="shrink-0" />
              {cityName}
            </span>
          )}
          <span className="font-sans text-[11px] text-[#808080]">{categoryLabel}</span>
          {rangeStr && (
            <span className="font-sans text-[11px] text-[#808080]">{rangeStr}</span>
          )}
        </div>
      </div>
      <span className="text-[#b8b8b8] text-base shrink-0 select-none pointer-events-none">›</span>
    </div>
  )
}
```

`CountryPage` itself (Task 4) stays an `async` Server Component as it is today; `UpcomingEvents` is rendered from it the same way `ActionCard` already is, a client component receiving already-serialized props, no `await` at the call site.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/components/UpcomingEvents.test.tsx`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add components/UpcomingEvents.tsx tests/components/UpcomingEvents.test.tsx
git commit -m "feat: add UpcomingEvents agenda component"
```

---

### Task 4: Wire `UpcomingEvents` into `CountryPage`

**Files:**
- Modify: `app/[locale]/[country]/page.tsx`

**Interfaces:**
- Consumes: `UpcomingEvents` from Task 3, `SerializedResource` from `lib/types.ts`.

No new automated test for this task (page-level integration in an existing untested route file, consistent with how `app/[locale]/[country]/page.tsx` has no test file today). Verified manually in Step 3.

- [ ] **Step 1: Add the import**

In `app/[locale]/[country]/page.tsx`, add to the import block (near the other component imports, e.g. after the `CityList` import on line 6):

```ts
import { UpcomingEvents } from '@/components/UpcomingEvents'
```

- [ ] **Step 2: Compute `upcomingEvents` and render the section**

In the "No city selector" branch, right after this existing line:

```ts
  const serializedCountry = country.resources.map(serializeResource)
  const serializedGlobal = globalResources.map(serializeResource)
```

add:

```ts
  const upcomingEvents = serializedCountry
    .filter((r) => r.kind === 'EVENT' && r.eventStartsAt !== null)
    .sort((a, b) => new Date(a.eventStartsAt as string).getTime() - new Date(b.eventStartsAt as string).getTime())
```

Then, in the returned JSX of that same branch, insert `<UpcomingEvents />` right before `{CATEGORY_ORDER.map((category) => (`:

```tsx
      <UpcomingEvents events={upcomingEvents} locale={locale as Locale} />

      {CATEGORY_ORDER.map((category) => (
        <ActionCard
          key={category}
          category={category}
          resources={resourcesByCategory[category] ?? []}
          locale={locale as Locale}
        />
      ))}
```

Do not touch the `hasCitySelector` branch (the `return` block that renders `<CityList ... />`, above this one in the same function).

- [ ] **Step 3: Manual verification**

Run the dev server: `npm run dev`

In the database (via `npx prisma studio` or a seed/manual insert), ensure at least one `PUBLISHED` resource exists with `countrySlug` set to a country that currently has `hasCitySelector === false` (i.e. fewer than 2 cities meeting `MIN_CITY_RESOURCES`), `kind: EVENT`, and `eventStartsAt` set to a future date. Also create a second `PUBLISHED` `kind: EVENT` resource for the same country with `eventStartsAt` left `null`.

Visit `http://localhost:3000/es/<that-country-slug>` in a browser and confirm:
- The "Próximos eventos" section appears above the category list, showing the event with a date, but not the one without a date.
- Both events (the one with a date and the one without) still appear inside their category's `ActionCard` further down the page, unchanged.
- A country with zero events shows no "Próximos eventos" section at all (no empty heading).
- Switching locale (e.g. `/en/<that-country-slug>`) shows the section heading and category label translated, and the date badge month abbreviation in English.

- [ ] **Step 4: Run the full test suite to check for regressions**

Run: `npx vitest run`
Expected: all tests pass, including the new ones from Tasks 1 and 3.

- [ ] **Step 5: Commit**

```bash
git add app/[locale]/[country]/page.tsx
git commit -m "feat: render upcoming events agenda on the country page"
```

---

## Self-Review Notes

- **Spec coverage:** helper (`formatEventBadge`, Task 1), translations (Task 2), component + visual style (Task 3), data selection/sort + page integration + scope guard on `hasCitySelector` (Task 4) all map to sections of `docs/superpowers/specs/2026-07-11-country-events-section-design.md`. The "Fuera de alcance" items (`CityList` branch, pagination, mandatory `eventStartsAt`, dedicated events page) are explicitly called out as untouched in Task 4 and the Global Constraints, not left ambiguous.
- **Type consistency:** `UpcomingEvents({ events: SerializedResource[], locale: Locale })` in Task 3 matches the call site in Task 4 (`<UpcomingEvents events={upcomingEvents} locale={locale as Locale} />`). `formatEventBadge(startIso: string, locale: Locale): { day, month }` from Task 1 is the exact signature consumed in Task 3's `EventAgendaRow`.
- **Server vs. client component:** resolved by checking the actual test pattern this codebase uses for `useTranslations` components (`tests/components/LangPopover.test.tsx`, `vi.mock('next-intl', ...)`, no `NextIntlClientProvider` anywhere in the repo) and confirming `ActionCard.tsx`/`ResourceLink.tsx`, the two closest existing components, are both `'use client'`. `UpcomingEvents` follows the same pattern, avoiding the mismatch between an async Server Component and this repo's existing component-test setup.
