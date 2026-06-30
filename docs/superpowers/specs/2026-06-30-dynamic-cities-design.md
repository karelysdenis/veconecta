# Dynamic Cities Design

**Date:** 2026-06-30
**Status:** Approved

## Problem

The `city` field on `Resource` is a free-text `String?`. Cities are derived on the fly via `groupBy({ by: ['city'] })` and their URL slugs are computed at query time with `cityToSlug()`. This makes data inconsistency possible, multilingual city names impossible, and city lookup a fragile text-matching hack.

## Solution

Introduce a `City` model as a managed entity per country. Resources reference cities via FK. Admins maintain the city list for each country from the country edit page.

---

## Schema

### New model: `City`

```prisma
model City {
  id          String     @id @default(cuid())
  countrySlug String
  country     Country    @relation(fields: [countrySlug], references: [slug])
  slug        String     // generated from nameEs via cityToSlug, immutable after creation
  nameEs      String
  nameEn      String?
  namePt      String?
  resources   Resource[]

  @@unique([countrySlug, slug])
  @@index([countrySlug])
}
```

### Changes to `Resource`

- Remove: `city String?`
- Add: `cityId String?` (nullable FK to City)
- Remove: `@@index([city])`
- Add: `@@index([cityId])`

Resources with `cityId = null` are "national" — shown on all city pages for their country.

### Changes to `Country`

- Add relation: `cities City[]`

---

## Admin

### City management — `/admin/countries/[slug]`

New "Ciudades" section at the bottom of the country edit page (after the existing form fields):

- Lists all cities for the country: slug, nameEs, nameEn, namePt
- Each city has: **Editar** link + **Eliminar** button (disabled if city has resources linked)
- Inline "Nueva ciudad" form at the bottom:
  - nameEs (required)
  - nameEn (optional)
  - namePt (optional)
  - slug is auto-generated via `cityToSlug(nameEs)`, not shown in the form
  - Server Action: creates the City record, revalidates the page

### City edit — `/admin/countries/[slug]/cities/[cityId]`

New page, same pattern as country edit:
- Fields: nameEs, nameEn, namePt (all editable)
- slug: shown as read-only (not editable — changing it would break URLs)
- Server Action: updates the city, redirects back to `/admin/countries/[slug]`

### Resource forms — `/admin/[country]/new` and `/admin/[country]/[id]`

"Ciudad / Región" free-text field replaced with a `<select>`:

```
Ciudad / Región
[ — Nacional (sin ciudad específica) ]   ← cityId = null
[ Bogotá                             ]
[ Medellín                           ]
...
```

- Options fetched from `City.findMany({ where: { countrySlug } })` ordered alphabetically
- If the country has no cities configured, the field is not rendered
- The select stores `cityId` (or empty string for null)

---

## Frontend

### `/[locale]/[country]` — country page

City list derived from City model instead of resource groupBy:

```ts
prisma.city.findMany({
  where: { countrySlug: slug },
  include: {
    _count: {
      select: { resources: { where: { status: 'PUBLISHED' } } }
    }
  }
})
```

Filtered to cities with at least 1 published resource. Sorted by resource count descending (same as today). `hasCitySelector` threshold stays at 2.

`isVirtualCity` is removed — no longer needed.

### `/[locale]/[country]/[city]` — city page

City lookup becomes a direct DB query:

```ts
prisma.city.findFirst({ where: { countrySlug, slug: citySlug } })
```

Resource filter changes from text-matching to FK:

```ts
// City resources: exact city match OR national (cityId = null)
resources.filter(r => r.cityId === city.id || r.cityId === null)
```

City name displayed per locale: `city.nameEs`, `city.nameEn`, `city.namePt`.

Metadata uses the localized city name.

### `CityList` component

No changes — already accepts `{ name, slug, count }[]`. Callers pass the new shape from City model.

---

## Migration

### Step 1 — Prisma migration

Adds `City` table and `cityId` column to `Resource`. Keeps old `city` column temporarily (both columns coexist).

### Step 2 — Data migration script

`prisma/migrate-cities.ts` (run once manually):

```
For each country:
  1. Find distinct non-null, non-virtual city values from Resource
  2. Create City record: nameEs = city value, slug = cityToSlug(city), nameEn/namePt = null
  3. For each Resource with that city value: set cityId = new city's id
  4. Resources with city = 'Nacional' or city = null: cityId stays null

Virtual cities to exclude: 'Nacional' and any value matched by current isVirtualCity()
```

After validating in production: nameEn/namePt can be filled via the admin UI.

### Step 3 — Prisma migration (cleanup)

Drops `city` column from `Resource` and removes `isVirtualCity` from `lib/slugify.ts`.

### Seed update

`prisma/seed.ts` updated to:
1. Create City records for each country explicitly (with nameEs/nameEn/namePt)
2. Reference cities by ID when creating resources (no more inline `city:` text)

---

## Files affected

| File | Change |
|---|---|
| `prisma/schema.prisma` | Add City model, update Resource |
| `prisma/seed.ts` | Create City records, use cityId on resources |
| `prisma/migrate-cities.ts` | New one-off data migration script |
| `app/admin/(dashboard)/countries/[slug]/page.tsx` | Add city management section |
| `app/admin/(dashboard)/countries/[slug]/cities/[cityId]/page.tsx` | New: edit city page |
| `app/admin/(dashboard)/[country]/new/page.tsx` | City select |
| `app/admin/(dashboard)/[country]/[id]/page.tsx` | City select |
| `app/[locale]/[country]/page.tsx` | Query cities from City model |
| `app/[locale]/[country]/[city]/page.tsx` | Lookup via City model |
| `lib/slugify.ts` | Remove isVirtualCity (step 3) |
