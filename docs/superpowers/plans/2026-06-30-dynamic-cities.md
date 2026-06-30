# Dynamic Cities Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the free-text `city` field on `Resource` with a managed `City` model per country, with multilingual names and FK integrity.

**Architecture:** Two-phase Prisma migration (add City + cityId, run data script, then drop legacy city column). Admin manages cities from the country edit page. Resource forms use a select. Frontend queries City directly instead of groupBy on resource text.

**Tech Stack:** Next.js 15 App Router, Prisma, PostgreSQL, TypeScript, Tailwind, Server Actions

## Global Constraints

- All Server Actions must call `getSession()` and guard by role before any DB write
- City slugs are generated via `cityToSlug(nameEs)` from `lib/slugify.ts` and are immutable after creation
- `cityId = null` on a resource means "nacional" — shown on all city pages for that country
- Run `npx prisma generate` after every schema change before touching application code
- No client components unless strictly necessary (server actions handle all mutations)

---

### Task 1: Schema migration 1 — Add City model and cityId to Resource

**Files:**
- Modify: `prisma/schema.prisma`
- Run: `npx prisma migrate dev --name add_city_model`
- Run: `npx prisma generate`

**Interfaces:**
- Produces: `City` Prisma model, `Resource.cityId String?`, `Resource.cityRel City?` relation available in all subsequent tasks

- [ ] **Step 1: Update schema.prisma**

Add the `City` model and update `Country` and `Resource`:

```prisma
// After the Country model, add:
model City {
  id          String     @id @default(cuid())
  countrySlug String
  country     Country    @relation(fields: [countrySlug], references: [slug])
  slug        String
  nameEs      String
  nameEn      String?
  namePt      String?
  resources   Resource[]

  @@unique([countrySlug, slug])
  @@index([countrySlug])
}
```

In the `Country` model, add the relation field after `resources Resource[]`:
```prisma
  cities      City[]
```

In the `Resource` model, add after the existing `city String?` line:
```prisma
  cityId      String?
  cityRel     City?            @relation(fields: [cityId], references: [id])
```

And add a new index (keep the existing `@@index([city])` for now):
```prisma
  @@index([cityId])
```

The `city String?` field and its index remain — they will be dropped in Task 8.

- [ ] **Step 2: Run migration**

```bash
npx prisma migrate dev --name add_city_model
```

Expected output: `The following migration(s) have been created and applied from new schema changes: migrations/..._add_city_model`

- [ ] **Step 3: Regenerate Prisma client**

```bash
npx prisma generate
```

Expected output: `✔ Generated Prisma Client`

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat: add City model and cityId FK to Resource (migration 1 of 2)"
```

---

### Task 2: Data migration script — populate City records from existing resource.city text

**Files:**
- Create: `prisma/migrate-cities.ts`

**Interfaces:**
- Consumes: `resource.city String?` (legacy text field, still present), `cityToSlug(string)` from `lib/slugify`
- Produces: City records in DB for every unique non-virtual city value, `resource.cityId` set on all matching resources

- [ ] **Step 1: Create the migration script**

```typescript
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
    select: { id: true, countrySlug: true, city: true },
  })

  // Collect unique (countrySlug, cityName) pairs
  const pairs = new Map<string, { countrySlug: string; cityName: string }>()
  for (const r of resources) {
    if (!r.city || isVirtual(r.city)) continue
    pairs.set(`${r.countrySlug}::${r.city}`, { countrySlug: r.countrySlug, cityName: r.city })
  }

  // Create City records
  const cityIds = new Map<string, string>() // key → id
  for (const [key, { countrySlug, cityName }] of pairs) {
    const city = await prisma.city.create({
      data: {
        countrySlug,
        slug: cityToSlug(cityName),
        nameEs: cityName,
      },
    })
    cityIds.set(key, city.id)
    console.log(`Created: [${countrySlug}] ${cityName} → ${city.slug}`)
  }

  // Update resources
  let updated = 0
  for (const r of resources) {
    if (!r.city || isVirtual(r.city)) continue
    const cityId = cityIds.get(`${r.countrySlug}::${r.city}`)
    if (!cityId) continue
    await prisma.resource.update({ where: { id: r.id }, data: { cityId } })
    updated++
  }

  console.log(`\nDone: ${cityIds.size} cities created, ${updated} resources updated.`)
}

main().catch(console.error).finally(() => prisma.$disconnect())
```

- [ ] **Step 2: Run the script against the DB**

```bash
npx tsx prisma/migrate-cities.ts
```

Expected output lists each city created and ends with something like:
```
Created: [colombia] Bogotá → bogota
Created: [colombia] Medellín → medellin
...
Done: 14 cities created, 38 resources updated.
```

- [ ] **Step 3: Verify in Prisma Studio**

```bash
npx prisma studio
```

Open the `City` table — confirm cities exist for each country. Open `Resource` — confirm resources have `cityId` set (except "Nacional" ones which stay null).

- [ ] **Step 4: Commit**

```bash
git add prisma/migrate-cities.ts
git commit -m "feat: data migration script to populate City records from resource.city text"
```

---

### Task 3: Admin — city management section in country edit page

**Files:**
- Modify: `app/admin/(dashboard)/countries/[slug]/page.tsx`

**Interfaces:**
- Consumes: `prisma.city.findMany`, `prisma.city.create`, `prisma.city.delete`, `cityToSlug` from `lib/slugify`
- Produces: admin can list, add, and delete cities for a country from the country edit page

- [ ] **Step 1: Update the page query and add server actions**

Replace the top of `EditCountryPage` — update the query to also fetch cities with resource counts, and add `createCity` and `deleteCity` server actions. Add import for `cityToSlug`:

```typescript
import { cityToSlug } from '@/lib/slugify'
```

Update the `prisma.country.findUnique` call:
```typescript
const [country, cities] = await Promise.all([
  prisma.country.findUnique({ where: { slug } }),
  prisma.city.findMany({
    where: { countrySlug: slug },
    include: { _count: { select: { resources: true } } },
    orderBy: { nameEs: 'asc' },
  }),
])
if (!country) notFound()
```

Add the two server actions after the existing `save` function:

```typescript
async function createCity(fd: FormData) {
  'use server'
  const { user } = await getSession()
  if (!user || user.role !== 'ADMIN') return
  const nameEs = (fd.get('nameEs') as string).trim()
  if (!nameEs) return
  await prisma.city.create({
    data: {
      countrySlug: slug,
      slug: cityToSlug(nameEs),
      nameEs,
      nameEn: (fd.get('nameEn') as string).trim() || null,
      namePt: (fd.get('namePt') as string).trim() || null,
    },
  })
  revalidatePath(`/admin/countries/${slug}`)
}

async function deleteCity(fd: FormData) {
  'use server'
  const { user } = await getSession()
  if (!user || user.role !== 'ADMIN') return
  const cityId = fd.get('cityId') as string
  const count = await prisma.resource.count({ where: { cityId } })
  if (count > 0) return // guard: don't delete cities with resources
  await prisma.city.delete({ where: { id: cityId } })
  revalidatePath(`/admin/countries/${slug}`)
}
```

- [ ] **Step 2: Add the Ciudades section to the JSX**

Add this section after the closing `</form>` tag (before the closing `</div>` of the page):

```tsx
      {/* Ciudades */}
      <div className="mt-8">
        <h2 className="text-base font-semibold text-gray-900 mb-3">Ciudades</h2>

        {cities.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mb-4">
            {cities.map((city, i) => (
              <div
                key={city.id}
                className={`flex items-center gap-3 px-4 py-3 ${i < cities.length - 1 ? 'border-b border-gray-100' : ''}`}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{city.nameEs}</p>
                  <p className="text-xs text-gray-400">
                    {[city.nameEn, city.namePt].filter(Boolean).join(' · ')}
                    {city._count.resources > 0 && (
                      <span className="ml-2 text-gray-300">{city._count.resources} recursos</span>
                    )}
                  </p>
                </div>
                <p className="text-xs text-gray-300 font-mono shrink-0">{city.slug}</p>
                <Link
                  href={`/admin/countries/${slug}/cities/${city.id}`}
                  className="text-xs border border-gray-200 text-gray-600 px-2.5 py-1 rounded hover:bg-gray-50 shrink-0"
                >
                  Editar
                </Link>
                <form action={deleteCity}>
                  <input type="hidden" name="cityId" value={city.id} />
                  <button
                    type="submit"
                    disabled={city._count.resources > 0}
                    className="text-xs border border-red-100 text-red-400 px-2.5 py-1 rounded hover:bg-red-50 disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
                  >
                    Eliminar
                  </button>
                </form>
              </div>
            ))}
          </div>
        )}

        <form action={createCity} className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
          <p className="text-sm font-medium text-gray-700">Nueva ciudad</p>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Nombre ES <span className="text-red-400">*</span></label>
              <input name="nameEs" required placeholder="ej: Bogotá"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Nombre EN</label>
              <input name="nameEn" placeholder="ej: Bogota"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Nombre PT</label>
              <input name="namePt" placeholder="ej: Bogotá"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300" />
            </div>
          </div>
          <div className="flex justify-end">
            <button type="submit"
              className="text-sm bg-gray-900 text-white px-4 py-2 rounded-lg hover:bg-gray-700">
              + Añadir ciudad
            </button>
          </div>
        </form>
      </div>
```

- [ ] **Step 3: Verify**

Run the dev server (`npm run dev`), open `/admin/countries/colombia`. The "Ciudades" section should appear below the form, listing all cities. Adding a new city should refresh the list. The delete button should be disabled for cities with resources.

- [ ] **Step 4: Commit**

```bash
git add app/admin/\(dashboard\)/countries/\[slug\]/page.tsx
git commit -m "feat: add city management section to country edit page"
```

---

### Task 4: Admin — edit city page

**Files:**
- Create: `app/admin/(dashboard)/countries/[slug]/cities/[cityId]/page.tsx`

**Interfaces:**
- Consumes: `prisma.city.findUnique`, `prisma.city.update`
- Produces: admin can edit nameEs, nameEn, namePt of an existing city (slug is read-only)

- [ ] **Step 1: Create the edit city page**

```typescript
// app/admin/(dashboard)/countries/[slug]/cities/[cityId]/page.tsx
import { notFound, redirect } from 'next/navigation'
import { getSession } from '@/lib/lucia'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import Link from 'next/link'

export default async function EditCityPage({
  params,
}: {
  params: Promise<{ slug: string; cityId: string }>
}) {
  const { slug, cityId } = await params
  const { user } = await getSession()
  if (!user) redirect('/admin/login')
  if (user.role !== 'ADMIN') redirect('/admin')

  const city = await prisma.city.findUnique({ where: { id: cityId } })
  if (!city || city.countrySlug !== slug) notFound()

  async function save(fd: FormData) {
    'use server'
    const { user } = await getSession()
    if (!user || user.role !== 'ADMIN') return
    await prisma.city.update({
      where: { id: cityId },
      data: {
        nameEs: (fd.get('nameEs') as string).trim(),
        nameEn: (fd.get('nameEn') as string).trim() || null,
        namePt: (fd.get('namePt') as string).trim() || null,
      },
    })
    revalidatePath(`/admin/countries/${slug}`)
    redirect(`/admin/countries/${slug}`)
  }

  return (
    <div className="max-w-2xl">
      <nav className="flex items-center gap-2 mb-6 text-sm">
        <Link href="/admin" className="text-gray-400 hover:text-gray-700">Inicio</Link>
        <span className="text-gray-300">/</span>
        <Link href={`/admin/countries/${slug}`} className="text-gray-400 hover:text-gray-700">Editar país</Link>
        <span className="text-gray-300">/</span>
        <span className="text-gray-900 font-medium">{city.nameEs}</span>
      </nav>

      <h1 className="text-xl font-bold text-gray-900 mb-6">Editar ciudad</h1>

      <form action={save} className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Slug <span className="text-xs text-gray-400 font-normal">(no editable — afecta URLs públicas)</span>
          </label>
          <input type="text" value={city.slug} disabled
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-400 cursor-not-allowed font-mono" />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <F label="Nombre ES" name="nameEs" defaultValue={city.nameEs} required />
          <F label="Nombre EN" name="nameEn" defaultValue={city.nameEn ?? ''} />
          <F label="Nombre PT" name="namePt" defaultValue={city.namePt ?? ''} />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Link href={`/admin/countries/${slug}`} className="text-sm text-gray-600 hover:underline px-4 py-2">
            Cancelar
          </Link>
          <button type="submit"
            className="bg-red-700 text-white text-sm font-medium px-5 py-2 rounded-lg hover:bg-red-800">
            Guardar cambios
          </button>
        </div>
      </form>
    </div>
  )
}

function F({ label, name, defaultValue = '', required = false }: {
  label: string; name: string; defaultValue?: string; required?: boolean
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input type="text" name={name} defaultValue={defaultValue} required={required}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300" />
    </div>
  )
}
```

- [ ] **Step 2: Verify**

Open `/admin/countries/colombia`, click "Editar" on any city. Edit the names, save, confirm it returns to the country page with updated names.

- [ ] **Step 3: Commit**

```bash
git add "app/admin/(dashboard)/countries/[slug]/cities/[cityId]/page.tsx"
git commit -m "feat: add edit city page at /admin/countries/[slug]/cities/[cityId]"
```

---

### Task 5: Admin — city select in resource forms and updated resource lists

**Files:**
- Modify: `app/admin/(dashboard)/[country]/new/page.tsx`
- Modify: `app/admin/(dashboard)/[country]/[id]/page.tsx`
- Modify: `app/admin/(dashboard)/[country]/page.tsx`
- Modify: `app/admin/(dashboard)/review/page.tsx`
- Modify: `app/admin/(dashboard)/[country]/review/page.tsx`

**Interfaces:**
- Consumes: `prisma.city.findMany({ where: { countrySlug } })`, `City` type with `id, nameEs`
- Produces: resource create/edit stores `cityId`; resource lists display `cityRel.nameEs`

- [ ] **Step 1: Update new resource page (`[country]/new/page.tsx`)**

Add cities query before the `create` server action:
```typescript
const [countryRecord, cities] = await Promise.all([
  prisma.country.findUnique({ where: { slug: country } }),
  prisma.city.findMany({ where: { countrySlug: country }, orderBy: { nameEs: 'asc' } }),
])
```

In the `create` server action, replace:
```typescript
city: (fd.get('city') as string).trim() || null,
```
with:
```typescript
cityId: (fd.get('cityId') as string) || null,
```

In the JSX, replace:
```tsx
<F label="Ciudad / Región" name="city" />
```
with:
```tsx
{cities.length > 0 && (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-1">Ciudad / Región</label>
    <select name="cityId"
      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300">
      <option value="">— Nacional (sin ciudad específica)</option>
      {cities.map(c => (
        <option key={c.id} value={c.id}>{c.nameEs}</option>
      ))}
    </select>
  </div>
)}
```

- [ ] **Step 2: Update edit resource page (`[country]/[id]/page.tsx`)**

Add cities query (parallel with existing resource query):
```typescript
const [resource, countryRecord, cities] = await Promise.all([
  prisma.resource.findUnique({ where: { id } }),
  prisma.country.findUnique({ where: { slug: country } }),
  prisma.city.findMany({ where: { countrySlug: country }, orderBy: { nameEs: 'asc' } }),
])
```

In the `save` server action, replace:
```typescript
city: (fd.get('city') as string).trim() || null,
```
with:
```typescript
cityId: (fd.get('cityId') as string) || null,
```

In the JSX, replace:
```tsx
<F label="Ciudad / Región" name="city" defaultValue={resource.city ?? ''} />
```
with:
```tsx
{cities.length > 0 && (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-1">Ciudad / Región</label>
    <select name="cityId"
      defaultValue={resource.cityId ?? ''}
      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300">
      <option value="">— Nacional (sin ciudad específica)</option>
      {cities.map(c => (
        <option key={c.id} value={c.id}>{c.nameEs}</option>
      ))}
    </select>
  </div>
)}
```

- [ ] **Step 3: Update resource list (`[country]/page.tsx`)**

In the `countryRecord` query, include `cityRel` in the resources:
```typescript
const countryRecord = await prisma.country.findUnique({
  where: { slug: country },
  include: {
    resources: {
      where: { status: { not: ResourceStatus.ARCHIVED } },
      orderBy: [{ status: 'asc' }, { category: 'asc' }, { createdAt: 'asc' }],
      include: { cityRel: true },
    },
  },
})
```

Replace both occurrences of:
```tsx
{r.city && <span className="text-xs text-gray-400">{r.city}</span>}
```
with:
```tsx
{r.cityRel && <span className="text-xs text-gray-400">{r.cityRel.nameEs}</span>}
```

- [ ] **Step 4: Update global review page (`review/page.tsx`)**

In the resource query, add `include: { cityRel: true }` and the `select` for resources. Find where resources are fetched:

```typescript
// In the groupBy or findMany for resources, add:
// For the review page, resources are fetched via prisma.resource.findMany
// Add include to that query:
include: { cityRel: true }
```

Replace:
```tsx
{resource.city && (
  <span ...>{resource.city}</span>
)}
```
with:
```tsx
{resource.cityRel && (
  <span ...>{resource.cityRel.nameEs}</span>
)}
```

- [ ] **Step 5: Update country review page (`[country]/review/page.tsx`)**

Same pattern — add `include: { cityRel: true }` to the resource query, replace `resource.city` with `resource.cityRel?.nameEs`.

- [ ] **Step 6: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 7: Verify manually**

Open `/admin/colombia/new` — the city select should show Colombia's cities. Create a resource, confirm it saves with the right city. Open an existing resource at `/admin/colombia/[id]` — the select should default to the resource's current city.

- [ ] **Step 8: Commit**

```bash
git add "app/admin/(dashboard)/[country]/new/page.tsx" \
        "app/admin/(dashboard)/[country]/[id]/page.tsx" \
        "app/admin/(dashboard)/[country]/page.tsx" \
        "app/admin/(dashboard)/review/page.tsx" \
        "app/admin/(dashboard)/[country]/review/page.tsx"
git commit -m "feat: replace city text input with city select in resource forms"
```

---

### Task 6: Frontend — country page queries City model

**Files:**
- Modify: `app/[locale]/[country]/page.tsx`

**Interfaces:**
- Consumes: `prisma.city.findMany` with resource count, `City` type
- Produces: `CityEntry[]` sourced from City model; `CityList` and `hasCitySelector` work as before

- [ ] **Step 1: Replace the cityGroups query**

In `app/[locale]/[country]/page.tsx`, find the `[globalResources, cityGroups]` parallel query and replace the `cityGroups` part:

```typescript
const [globalResources, citiesWithCount] = await Promise.all([
  prisma.resource.findMany({
    where: { countrySlug: 'global', status: ResourceStatus.PUBLISHED },
    orderBy: { createdAt: 'asc' },
  }),
  prisma.city.findMany({
    where: { countrySlug: slug },
    include: {
      _count: {
        select: { resources: { where: { status: ResourceStatus.PUBLISHED } } },
      },
    },
  }),
])
```

- [ ] **Step 2: Replace realCities derivation**

Find and replace the `realCities` block:

```typescript
// Remove the old cityGroups / realCities block and isVirtualCity import.
// Replace with:
const realCities: CityEntry[] = citiesWithCount
  .filter((c) => c._count.resources > 0)
  .map((c) => ({
    name: c.nameEs,
    slug: c.slug,
    count: c._count.resources,
  }))
  .sort((a, b) => b.count - a.count)
```

Also remove the `cityToSlug` and `isVirtualCity` imports from the top of the file (they're no longer used here).

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Verify manually**

Open `/es/colombia` — should show the city list (Bogotá, Medellín, etc.) as before.

- [ ] **Step 5: Commit**

```bash
git add "app/[locale]/[country]/page.tsx"
git commit -m "feat: derive city list from City model on country page"
```

---

### Task 7: Frontend — city page uses City model lookup

**Files:**
- Modify: `app/[locale]/[country]/[city]/page.tsx`

**Interfaces:**
- Consumes: `prisma.city.findFirst({ where: { countrySlug, slug: citySlug } })`, `resource.cityId`
- Produces: city page resolves city name from DB, filters resources by FK

- [ ] **Step 1: Replace city name lookup**

In `app/[locale]/[country]/[city]/page.tsx`, after the `countrySlug` is established, replace the entire block that finds `cityName` via text matching:

```typescript
// Replace this block:
// const [allCountryResources, globalResources] = ...
// const cityName = allCountryResources.find(r => r.city && cityToSlug(r.city) === citySlug)?.city
// if (!cityName) notFound()

// With:
const [cityRecord, allCountryResources, globalResources] = await Promise.all([
  prisma.city.findFirst({ where: { countrySlug, slug: citySlug } }),
  prisma.resource.findMany({
    where: { countrySlug, status: ResourceStatus.PUBLISHED },
    orderBy: { createdAt: 'asc' },
  }),
  prisma.resource.findMany({
    where: { countrySlug: 'global', status: ResourceStatus.PUBLISHED },
    orderBy: { createdAt: 'asc' },
  }),
])

if (!cityRecord) notFound()

const cityName =
  locale === 'en'
    ? (cityRecord.nameEn ?? cityRecord.nameEs)
    : locale === 'pt'
      ? (cityRecord.namePt ?? cityRecord.nameEs)
      : cityRecord.nameEs
```

- [ ] **Step 2: Update resource filtering**

Replace:
```typescript
const cityResources = allCountryResources.filter(
  (r) => r.city === cityName || !r.city || r.city.toLowerCase() === 'nacional',
)
```
with:
```typescript
const cityResources = allCountryResources.filter(
  (r) => r.cityId === cityRecord!.id || r.cityId === null,
)
```

- [ ] **Step 3: Update generateMetadata**

In `generateMetadata`, replace the verbose multi-query city name lookup:

```typescript
// Replace the entire cityResource / allCityResources block with:
const [country, cityRecord] = await Promise.all([
  prisma.country.findFirst({ where: whereLocalized }),
  prisma.city.findFirst({
    where: async () => {
      // Need countrySlug first — keep sequential here
    }
  }),
])
```

Actually `generateMetadata` needs the countrySlug before querying the city. Keep it sequential:

```typescript
export async function generateMetadata({ params }: {
  params: Promise<{ locale: string; country: string; city: string }>
}): Promise<Metadata> {
  const { locale, country: urlSlug, city: citySlug } = await params
  const whereLocalized = locale === 'en' ? { slugEn: urlSlug } : locale === 'pt' ? { slugPt: urlSlug } : { slugEs: urlSlug }

  const country = await prisma.country.findFirst({ where: whereLocalized })
  if (!country) return {}

  const cityRecord = await prisma.city.findFirst({ where: { countrySlug: country.slug, slug: citySlug } })
  const cityName = cityRecord
    ? (locale === 'en' ? (cityRecord.nameEn ?? cityRecord.nameEs) : locale === 'pt' ? (cityRecord.namePt ?? cityRecord.nameEs) : cityRecord.nameEs)
    : citySlug

  const countryName = locale === 'en' ? country.nameEn : country.nameEs

  return {
    title: `${cityName}, ${countryName} | VeConecta`,
    description:
      locale === 'en'
        ? `Verified resources for Venezuelans in ${cityName}, ${countryName}.`
        : `Recursos verificados para venezolanos en ${cityName}, ${countryName}.`,
    openGraph: { type: 'website', siteName: 'VeConecta', images: [{ url: '/api/og', width: 1200, height: 630 }] },
  }
}
```

- [ ] **Step 4: Remove unused imports**

Remove `cityToSlug` import from the top of the file (no longer used).

- [ ] **Step 5: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

- [ ] **Step 6: Verify manually**

Open `/es/colombia/bogota` — page should load with "Bogotá" as the title and resources for that city. Open `/es/colombia/ciudad-inexistente` — should 404.

- [ ] **Step 7: Commit**

```bash
git add "app/[locale]/[country]/[city]/page.tsx"
git commit -m "feat: city page resolves city name and resources via City model FK"
```

---

### Task 8: Cleanup — drop legacy city column, update seed

**Files:**
- Modify: `prisma/schema.prisma`
- Run: `npx prisma migrate dev --name drop_resource_city_text`
- Modify: `prisma/seed.ts`
- Modify: `lib/slugify.ts`

**Interfaces:**
- Consumes: nothing from previous tasks (cleanup only)
- Produces: no `city String?` in Resource, seed creates cities explicitly, `isVirtualCity` removed

- [ ] **Step 1: Update schema — remove city text field**

In `prisma/schema.prisma`, in the `Resource` model:
- Remove `city        String?`
- Remove `@@index([city])`
- Rename `cityRel     City?` to `city        City?` (Prisma field name only, no SQL effect)

The Resource model city section should now read:
```prisma
  cityId      String?
  city        City?            @relation(fields: [cityId], references: [id])
  ...
  @@index([cityId])
```

- [ ] **Step 2: Run cleanup migration**

```bash
npx prisma migrate dev --name drop_resource_city_text
npx prisma generate
```

- [ ] **Step 3: Remove isVirtualCity from lib/slugify.ts**

Delete the `isVirtualCity` function and the `VIRTUAL_CITIES` set from `lib/slugify.ts`. The file should only contain `cityToSlug`.

- [ ] **Step 4: Update seed.ts**

Add `prisma.city.deleteMany({})` to the reset block (before `prisma.country.deleteMany({})`).

After creating countries, add explicit city creation and build a lookup map:

```typescript
// Cities per country
const cityData = [
  { countrySlug: 'spain',     nameEs: 'Madrid',        nameEn: 'Madrid',        namePt: 'Madrid' },
  { countrySlug: 'usa',       nameEs: 'Doral, FL',     nameEn: 'Doral, FL',     namePt: 'Doral, FL' },
  { countrySlug: 'usa',       nameEs: 'Miramar, FL',   nameEn: 'Miramar, FL',   namePt: 'Miramar, FL' },
  { countrySlug: 'usa',       nameEs: 'Miami (online)',nameEn: 'Miami (online)', namePt: 'Miami (online)' },
  { countrySlug: 'colombia',  nameEs: 'Bogotá',        nameEn: 'Bogotá',        namePt: 'Bogotá' },
  { countrySlug: 'colombia',  nameEs: 'Barranquilla',  nameEn: 'Barranquilla',  namePt: 'Barranquilla' },
  { countrySlug: 'colombia',  nameEs: 'Medellín',      nameEn: 'Medellín',      namePt: 'Medellín' },
  { countrySlug: 'colombia',  nameEs: 'Santa Marta',   nameEn: 'Santa Marta',   namePt: 'Santa Marta' },
  { countrySlug: 'colombia',  nameEs: 'Bucaramanga',   nameEn: 'Bucaramanga',   namePt: 'Bucaramanga' },
  { countrySlug: 'colombia',  nameEs: 'Cartagena',     nameEn: 'Cartagena',     namePt: 'Cartagena' },
  { countrySlug: 'argentina', nameEs: 'Buenos Aires',  nameEn: 'Buenos Aires',  namePt: 'Buenos Aires' },
  { countrySlug: 'mexico',    nameEs: 'CDMX',          nameEn: 'Mexico City',   namePt: 'Cidade do México' },
  { countrySlug: 'ecuador',   nameEs: 'Quito',         nameEn: 'Quito',         namePt: 'Quito' },
  { countrySlug: 'ecuador',   nameEs: 'Guayaquil',     nameEn: 'Guayaquil',     namePt: 'Guayaquil' },
  { countrySlug: 'peru',      nameEs: 'Lima',          nameEn: 'Lima',          namePt: 'Lima' },
  { countrySlug: 'chile',     nameEs: 'Santiago',      nameEn: 'Santiago',      namePt: 'Santiago' },
  { countrySlug: 'chile',     nameEs: 'Temuco',        nameEn: 'Temuco',        namePt: 'Temuco' },
  { countrySlug: 'chile',     nameEs: 'Calama',        nameEn: 'Calama',        namePt: 'Calama' },
]

const createdCities = await Promise.all(
  cityData.map(({ countrySlug, nameEs, nameEn, namePt }) =>
    prisma.city.create({
      data: { countrySlug, slug: cityToSlug(nameEs), nameEs, nameEn, namePt },
    })
  )
)

// Build lookup: "countrySlug::nameEs" → cityId
const cityMap = Object.fromEntries(
  createdCities.map((c) => [`${c.countrySlug}::${c.nameEs}`, c.id])
)
```

Add `import { cityToSlug } from '../lib/slugify'` at the top of seed.ts.

Then replace every `city: 'CityName'` in resource creation with `cityId: cityMap['countrySlug::CityName']` and remove `city:` from resources that have `city: 'Nacional'` (they get `cityId: undefined` which Prisma treats as null).

Example — Spain:
```typescript
// Before:
{ city: 'Nacional', ... }
{ city: 'Madrid', ... }

// After:
{ /* no city field */ ... }
{ cityId: cityMap['spain::Madrid'], ... }
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors. If any file still references `resource.city` (string) or `resource.cityRel`, fix them — they should now use `resource.city` (the relation object).

- [ ] **Step 6: Verify end-to-end**

```bash
npm run dev
```

- Open `/es/colombia` — city list loads from DB
- Open `/es/colombia/bogota` — city page works, shows Bogotá resources
- Open `/admin/countries/colombia` — cities listed, add/edit/delete work
- Open `/admin/colombia/new` — city select shows Colombia cities
- Open an existing Colombia resource in admin — city select defaults correctly

- [ ] **Step 7: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/ prisma/seed.ts lib/slugify.ts
git commit -m "feat: drop legacy city text column, update seed with explicit City records"
```
