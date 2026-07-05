# Página "Sobre" + feed de "Noticias" Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a static `/sobre` page (misión + metodología) and a `/noticias` feed (list + detail, ADMIN-authored) to VEconecta, per `docs/superpowers/specs/2026-07-05-sobre-noticias-design.md`.

**Architecture:** New Prisma model `Post` (cuid id, unique slug, `title`/`titleEn` + `body`/`bodyEn` i18n columns matching the existing `LOCALE_SUFFIX` convention, `PostStatus` DRAFT/PUBLISHED). Public read-only pages under `app/[locale]/sobre` and `app/[locale]/noticias`; ADMIN-only CRUD under `app/admin/(dashboard)/updates`, mirroring the existing Countries/Users admin patterns exactly (inline server actions, `getSession` + role guard, `logAction`, `revalidatePath`).

**Tech Stack:** Next.js 16 App Router, Prisma 5 / PostgreSQL, next-intl, Tailwind v4. No new dependencies.

## Global Constraints

- Model name is `Post`/`PostStatus`, not `Update` — `prisma.update.create()`/`.update()` would collide with Prisma's built-in CRUD method name (spec, "Modelo de datos").
- `title`/`body` are the bare Spanish columns (no `Es` suffix), `titleEn`/`bodyEn` the only other populated columns for now — same pattern as `Resource.name`/`notesEs`. `titlePt/Fr/De` and `bodyPt/Fr/De` are explicitly out of scope (spec, "Fuera de alcance").
- `publishedAt` is set automatically on first transition to `PUBLISHED`, never user-editable (spec, "`publishedAt`").
- Only `ADMIN` can manage posts — no `EDITOR` access anywhere in `/admin/updates` (spec, "Admin").
- The crisis-facts body text (ES/EN) must be inserted **verbatim**, character-for-character from `About the Crisis.txt` — do not paraphrase (spec, "Primer post de `/noticias`").
- No per-post cover image; reuse the existing generic `/api/og` route (spec, "Fuera de alcance").
- No test suite exists for `/admin/*` or `lib/locale-content.ts`-style helpers in this codebase (only `tests/api/reports-rate-limit.test.ts` exists, unrelated). Follow the established verification convention from prior specs: `pnpm exec tsc --noEmit` + manual browser check per task, not new vitest files.

---

### Task 1: Prisma schema — `Post` model + migration + seed post

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/<timestamp>_add_post_model/migration.sql` (timestamp assigned by Prisma when the command below runs)

**Interfaces:**
- Produces: `prisma.post` Prisma Client model with fields `id, slug, title, titleEn, body, bodyEn, status (PostStatus.DRAFT | PostStatus.PUBLISHED), publishedAt, createdAt, updatedAt`. Every later task reads/writes through this.

- [ ] **Step 1: Add the model to `prisma/schema.prisma`**

Open `prisma/schema.prisma` and insert this immediately after the closing `}` of `model Locale` (currently ends around line 141, right before the `AuditLog` model):

```prisma
model Post {
  id          String     @id @default(cuid())
  slug        String     @unique
  title       String
  titleEn     String?
  body        String
  bodyEn      String?
  status      PostStatus @default(DRAFT)
  publishedAt DateTime?
  createdAt   DateTime   @default(now())
  updatedAt   DateTime   @updatedAt

  @@index([status])
}
```

Then add the enum next to the other enums at the bottom of the file (near `enum ResourceStatus`):

```prisma
enum PostStatus {
  DRAFT
  PUBLISHED
}
```

- [ ] **Step 2: Generate the migration without applying it yet**

Run:
```bash
pnpm exec prisma migrate dev --name add_post_model --create-only
```
Expected: creates `prisma/migrations/<timestamp>_add_post_model/migration.sql` containing `CREATE TYPE "PostStatus" ...`, `CREATE TABLE "Post" ...`, `CREATE UNIQUE INDEX "Post_slug_key" ...`, `CREATE INDEX "Post_status_idx" ...`. Does not touch the database yet.

- [ ] **Step 3: Append the seed INSERT for the first post to the generated migration file**

Open the generated `migration.sql` and add this at the end (dollar-quoting avoids escaping the apostrophe in "country's"):

```sql
-- Seed: first Noticias post, verbatim crisis-facts text supplied by the
-- user (see docs/superpowers/specs/2026-07-05-sobre-noticias-design.md).
-- Not editorial content — do not reword when touching this file later.
INSERT INTO "Post" ("id", "slug", "title", "titleEn", "body", "bodyEn", "status", "publishedAt", "createdAt", "updatedAt")
VALUES (
  'seed-post-sobre-la-crisis',
  'sobre-la-crisis',
  'Sobre la crisis',
  'About the Crisis',
  $body_es$El miércoles 24 de junio, Venezuela fue sacudida por dos poderosos terremotos de magnitudes 7,2 y 7,5 que ocurrieron con apenas segundos de diferencia. Los sismos provocaron daños catastróficos en la costa norte del país, afectando especialmente al estado La Guaira, la ciudad de Caracas y varias zonas del estado Miranda.

Según Reuters, hasta el sábado 4 de julio, la cifra oficial de fallecidos ascendía a 2.954 personas. El gobierno venezolano informó que cerca de 30.000 funcionarios nacionales de emergencia y 3.281 rescatistas internacionales han sido desplegados para apoyar las labores de búsqueda, rescate y recuperación. Más de 16.000 personas han quedado sin hogar, mientras que un registro no oficial, pero ampliamente utilizado por organizaciones y familiares, reporta más de 41.000 personas desaparecidas.

La magnitud de la destrucción ha dejado a miles de familias desplazadas, ha sobrepasado la capacidad de hospitales y servicios de emergencia, ha dañado infraestructura crítica y ha dejado comunidades enteras buscando a sus seres queridos entre los escombros. Aunque las labores de rescate continúan, las necesidades humanitarias se extenderán mucho más allá de la respuesta inmediata. Miles de familias necesitarán refugio, alimentos, atención médica, agua potable, apoyo psicológico y asistencia a largo plazo para reconstruir sus vidas.$body_es$,
  $body_en$On Wednesday, June 24, Venezuela was struck by two powerful earthquakes measuring 7.2 and 7.5 in magnitude just seconds apart. The twin earthquakes caused catastrophic damage across the country's northern coast, particularly in the state of La Guaira, the city of Caracas, and parts of Miranda state.

According to Reuters, as of Saturday, July 4, the official death toll has risen to 2,954. The Venezuelan government says nearly 30,000 national emergency personnel and 3,281 international rescue workers have been deployed to assist with search, rescue, and recovery operations. More than 16,000 people have been left homeless, while an unofficial but widely used registry lists more than 41,000 people as still missing. (Reuters)

The destruction has displaced thousands of families, overwhelmed hospitals and emergency services, damaged critical infrastructure, and left entire communities searching for loved ones beneath the rubble. While rescue operations continue, the humanitarian needs will extend far beyond the initial emergency. Families will require shelter, food, medical care, clean water, mental health support, and long-term assistance to rebuild their lives. (Reuters)$body_en$,
  'PUBLISHED',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
);
```

- [ ] **Step 4: Apply the migration**

Run:
```bash
pnpm exec prisma migrate dev
```
Expected: `Applying migration <timestamp>_add_post_model` then `Your database is now in sync with your schema.` Prisma Client regenerates automatically (`postinstall` also runs `prisma generate`, but `migrate dev` triggers it too).

- [ ] **Step 5: Verify the seed row landed correctly**

Run:
```bash
pnpm exec prisma studio
```
Open the `Post` table, confirm one row with `slug = sobre-la-crisis`, `status = PUBLISHED`, and that `body`/`bodyEn` contain all three paragraphs with blank lines between them (not collapsed onto one line). Close Studio.

- [ ] **Step 6: Commit**

```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "feat: add Post model for Noticias feed, seed crisis-facts post"
```

---

### Task 2: Shared infra — rename `cityToSlug` → `slugify`, extend audit actions

**Files:**
- Modify: `lib/slugify.ts`
- Modify: `lib/city.ts`
- Modify: `prisma/seed.ts`
- Modify: `app/admin/(dashboard)/countries/[slug]/page.tsx`
- Modify: `lib/audit.ts`

**Interfaces:**
- Produces: `slugify(input: string): string` from `lib/slugify.ts` (used by Task 9's post-creation form). `AuditAction` union extended with `'POST_CREATE' | 'POST_EDIT' | 'POST_DELETE'`; `logAction`'s `entityType` union extended with `'post'` (used by Tasks 9–10).

- [ ] **Step 1: Rename the function in `lib/slugify.ts`**

Replace the file's only export:

```typescript
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}
```

- [ ] **Step 2: Update the three call sites**

In `lib/city.ts`, change:
```typescript
import { cityToSlug } from '@/lib/slugify'
```
to:
```typescript
import { slugify } from '@/lib/slugify'
```
and change `const slug = cityToSlug(newCityName)` to `const slug = slugify(newCityName)`.

In `prisma/seed.ts`, change:
```typescript
import { cityToSlug } from '../lib/slugify'
```
to:
```typescript
import { slugify } from '../lib/slugify'
```
and change `slug: cityToSlug(nameEs)` to `slug: slugify(nameEs)`.

In `app/admin/(dashboard)/countries/[slug]/page.tsx`, change:
```typescript
import { cityToSlug } from '@/lib/slugify'
```
to:
```typescript
import { slugify } from '@/lib/slugify'
```
and change `slug: cityToSlug(nameEs)` to `slug: slugify(nameEs)`.

- [ ] **Step 3: Verify no remaining references to the old name**

Run:
```bash
grep -rn "cityToSlug" --include="*.ts" --include="*.tsx" app lib prisma
```
Expected: no output (empty).

- [ ] **Step 4: Extend `lib/audit.ts`**

Change the `AuditAction` union from:
```typescript
export type AuditAction =
  | 'RESOURCE_CREATE'
  | 'RESOURCE_UPDATE'
  | 'RESOURCE_CONFIRM'
  | 'RESOURCE_PUBLISH'
  | 'RESOURCE_ARCHIVE'
  | 'RESOURCE_RESTORE'
  | 'USER_INVITE'
  | 'USER_UPDATE'
  | 'USER_DELETE'
  | 'COUNTRY_CREATE'
  | 'COUNTRY_UPDATE'
  | 'COUNTRY_DELETE'
  | 'LOCALE_TOGGLE'
```
to (add the three `POST_*` entries at the end):
```typescript
export type AuditAction =
  | 'RESOURCE_CREATE'
  | 'RESOURCE_UPDATE'
  | 'RESOURCE_CONFIRM'
  | 'RESOURCE_PUBLISH'
  | 'RESOURCE_ARCHIVE'
  | 'RESOURCE_RESTORE'
  | 'USER_INVITE'
  | 'USER_UPDATE'
  | 'USER_DELETE'
  | 'COUNTRY_CREATE'
  | 'COUNTRY_UPDATE'
  | 'COUNTRY_DELETE'
  | 'LOCALE_TOGGLE'
  | 'POST_CREATE'
  | 'POST_EDIT'
  | 'POST_DELETE'
```

And change the `entityType` field type from:
```typescript
  entityType: 'resource' | 'user' | 'country' | 'locale'
```
to:
```typescript
  entityType: 'resource' | 'user' | 'country' | 'locale' | 'post'
```

- [ ] **Step 5: Verify TypeScript compiles**

Run:
```bash
pnpm exec tsc --noEmit
```
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add lib/slugify.ts lib/city.ts prisma/seed.ts "app/admin/(dashboard)/countries/[slug]/page.tsx" lib/audit.ts
git commit -m "refactor: rename cityToSlug to slugify, extend audit actions for Post"
```

---

### Task 3: i18n messages for Sobre/Noticias

**Files:**
- Modify: `messages/es.json`, `messages/en.json`, `messages/pt.json`, `messages/fr.json`, `messages/de.json`

**Interfaces:**
- Produces: translation keys `footer.about`, `footer.news`, `about.title`, `updates.title`, `updates.empty`, `updates.publishedOn`, `updates.backToList` — consumed by Tasks 4, 5, 6, 7.

All 5 files share identical line numbers today (verified: `"footer"` at line 81, `"nav"` at line 84, `"resourceDetail"` at line 98, closing brace at line 114). Each file gets the same two edits: extend the `footer` block, and append two new top-level namespaces (`about`, `updates`) after `resourceDetail`.

- [ ] **Step 1: Edit `messages/es.json`**

Change:
```json
  "footer": {
    "cta": "¿Tienes un recurso para agregar?"
  },
```
to:
```json
  "footer": {
    "cta": "¿Tienes un recurso para agregar?",
    "about": "Sobre",
    "news": "Noticias"
  },
```

Change the file's last lines from:
```json
    "callNow": "Llamar ahora"
  }
}
```
to:
```json
    "callNow": "Llamar ahora"
  },
  "about": {
    "title": "Sobre VEconecta"
  },
  "updates": {
    "title": "Noticias",
    "empty": "Aún no hay publicaciones.",
    "publishedOn": "Publicado {date}",
    "backToList": "Volver a Noticias"
  }
}
```

- [ ] **Step 2: Edit `messages/en.json`**

Change:
```json
  "footer": {
    "cta": "Have a resource to add?"
  },
```
to:
```json
  "footer": {
    "cta": "Have a resource to add?",
    "about": "About",
    "news": "News"
  },
```

Change the file's last lines from:
```json
    "callNow": "Call now"
  }
}
```
to:
```json
    "callNow": "Call now"
  },
  "about": {
    "title": "About VEconecta"
  },
  "updates": {
    "title": "News",
    "empty": "No posts yet.",
    "publishedOn": "Published {date}",
    "backToList": "Back to News"
  }
}
```

- [ ] **Step 3: Edit `messages/pt.json`**

Same shape, Portuguese values. Change:
```json
  "footer": {
    "cta": "Tem um recurso para adicionar?"
  },
```
to:
```json
  "footer": {
    "cta": "Tem um recurso para adicionar?",
    "about": "Sobre",
    "news": "Notícias"
  },
```
and append:
```json
  "about": {
    "title": "Sobre a VEconecta"
  },
  "updates": {
    "title": "Notícias",
    "empty": "Ainda não há publicações.",
    "publishedOn": "Publicado em {date}",
    "backToList": "Voltar às Notícias"
  }
}
```
- [ ] **Step 4: Edit `messages/fr.json`**

French values. Change:
```json
  "footer": {
    "cta": "Une ressource à ajouter ?"
  },
```
to:
```json
  "footer": {
    "cta": "Une ressource à ajouter ?",
    "about": "À propos",
    "news": "Actualités"
  },
```
and append:
```json
  "about": {
    "title": "À propos de VEconecta"
  },
  "updates": {
    "title": "Actualités",
    "empty": "Pas encore de publications.",
    "publishedOn": "Publié le {date}",
    "backToList": "Retour aux actualités"
  }
}
```

- [ ] **Step 5: Edit `messages/de.json`**

German values. Change:
```json
  "footer": {
    "cta": "Eine Ressource hinzufügen?"
  },
```
to:
```json
  "footer": {
    "cta": "Eine Ressource hinzufügen?",
    "about": "Über uns",
    "news": "Neuigkeiten"
  },
```
and append:
```json
  "about": {
    "title": "Über VEconecta"
  },
  "updates": {
    "title": "Neuigkeiten",
    "empty": "Noch keine Beiträge.",
    "publishedOn": "Veröffentlicht am {date}",
    "backToList": "Zurück zu Neuigkeiten"
  }
}
```

- [ ] **Step 6: Verify every file is still valid JSON**

Run:
```bash
node -e "['es','en','pt','fr','de'].forEach(l => JSON.parse(require('fs').readFileSync('messages/'+l+'.json','utf8')))"
```
Expected: no output, no error (exit code 0).

- [ ] **Step 7: Commit**

```bash
git add messages/es.json messages/en.json messages/pt.json messages/fr.json messages/de.json
git commit -m "feat: add i18n strings for Sobre page and Noticias feed"
```

---

### Task 4: Public page `/[locale]/sobre`

**Files:**
- Create: `app/[locale]/sobre/page.tsx`

**Interfaces:**
- Consumes: `getTranslations('about')` → `title` key (Task 3). No Prisma queries.
- Produces: route `/[locale]/sobre`, linked from Task 7's footer.

- [ ] **Step 1: Create the page**

```tsx
import Link from 'next/link'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import type { Metadata } from 'next'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const isEn = locale === 'en'
  return {
    title: isEn ? 'About VEconecta' : 'Sobre VEconecta',
    description: isEn
      ? 'Why VEconecta exists and why we prioritize independent humanitarian organizations.'
      : 'Por qué existe VEconecta y por qué priorizamos organizaciones humanitarias independientes.',
    openGraph: {
      type: 'website',
      siteName: 'VEconecta',
      images: [{ url: '/api/og', width: 1200, height: 630 }],
    },
  }
}

export default async function AboutPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('about')
  const isEn = locale === 'en'

  return (
    <main className="min-h-screen bg-white px-5 pt-8 pb-10">
      <nav className="flex items-center gap-1.5 mb-6 text-sm">
        <Link href={`/${locale}`} className="text-caribe hover:underline">
          {isEn ? 'Home' : 'Inicio'}
        </Link>
        <span className="text-[#b8b8b8]">›</span>
        <span className="text-[#141414]">{t('title')}</span>
      </nav>

      <h1 className="font-display font-extrabold text-[24px] leading-[1.15] tracking-[-0.01em] text-[#141414] mb-6">
        {t('title')}
      </h1>

      {isEn ? <AboutContentEn /> : <AboutContentEs />}
    </main>
  )
}

function AboutContentEs() {
  return (
    <div className="space-y-5 font-sans font-light text-[15px] text-[#141414] leading-relaxed">
      <p>
        VEconecta es una iniciativa creada por un grupo de venezolanas en la diáspora tras los
        terremotos del 24 de junio.
      </p>

      <h2 className="font-display font-bold text-[19px] text-[#141414] pt-2">
        ¿Por qué existe VEconecta?
      </h2>
      <p>
        VEconecta nació con el propósito de servir como un centro de información para las personas
        que desean ayudar desde fuera de Venezuela. Nuestro objetivo es conectar a donantes,
        voluntarios, organizaciones y miembros de la diáspora venezolana con recursos confiables y
        verificados para que la ayuda llegue a las comunidades afectadas de la manera más rápida y
        efectiva posible.
      </p>
      <p>
        Ya sea que desees realizar una donación, ofrecer tus habilidades como voluntario, organizar
        centros de acopio en tu comunidad o simplemente mantenerte informado, esta plataforma busca
        facilitar el acceso a formas seguras y confiables de apoyar a quienes han sido afectados por
        esta tragedia.
      </p>

      <h2 className="font-display font-bold text-[19px] text-[#141414] pt-2">
        ¿Por qué priorizamos organizaciones humanitarias independientes?
      </h2>
      <p>
        Muchas personas nos han preguntado por qué VEconecta prioriza organizaciones sin fines de
        lucro independientes, organizaciones humanitarias, iniciativas comunitarias y organismos
        internacionales de ayuda, en lugar de organismos directamente vinculados al gobierno
        venezolano.
      </p>
      <p>
        La respuesta se encuentra en la historia reciente del país. Durante más de dos décadas,
        Venezuela ha atravesado un proceso de deterioro democrático, denuncias de corrupción
        generalizada, debilitamiento institucional, una profunda crisis económica y una de las
        mayores crisis de desplazamiento humano del mundo. Diversos organismos internacionales,
        incluidos las Naciones Unidas, organizaciones de derechos humanos y entidades especializadas
        en transparencia, han documentado preocupaciones persistentes sobre la falta de
        transparencia, la rendición de cuentas y la politización de instituciones públicas. Estas
        circunstancias han reducido significativamente la confianza de muchos ciudadanos en la
        distribución estatal de la ayuda humanitaria.
      </p>
      <p>
        Por esta razón, numerosas organizaciones de la sociedad civil venezolana, expertos en ayuda
        humanitaria y miembros de la diáspora recomiendan canalizar las donaciones a través de
        organizaciones independientes que cuenten con mecanismos sólidos de transparencia, rendición
        de cuentas y trabajo directo con las comunidades afectadas. Estas organizaciones suelen
        colaborar con voluntarios locales, aliados internacionales y líderes comunitarios para
        procurar que la ayuda llegue de forma directa a quienes más la necesitan.
      </p>
      <p>
        VEconecta no respalda a ningún partido político ni movimiento ideológico. Nuestra misión es
        exclusivamente humanitaria: brindar información confiable para que cada persona pueda tomar
        decisiones informadas sobre cómo ayudar y contribuir a que la asistencia llegue a los
        venezolanos afectados por esta tragedia de la manera más eficiente, transparente y
        responsable posible.
      </p>
    </div>
  )
}

function AboutContentEn() {
  return (
    <div className="space-y-5 font-sans font-light text-[15px] text-[#141414] leading-relaxed">
      <p>
        VEconecta is an initiative created by a group of Venezuelan women in the diaspora following
        the June 24 earthquakes.
      </p>

      <h2 className="font-display font-bold text-[19px] text-[#141414] pt-2">
        Why VEconecta Exists
      </h2>
      <p>
        VEconecta was created to serve as a centralized hub for people outside Venezuela who want to
        help. Our goal is to connect donors, volunteers, organizations, and members of the
        Venezuelan diaspora with trusted, verified resources so assistance can reach affected
        communities as quickly and effectively as possible.
      </p>
      <p>
        Whether you wish to donate, volunteer your professional skills, organize local collection
        drives, or simply stay informed, this platform aims to make it easier to find reliable ways
        to support those impacted by the disaster.
      </p>

      <h2 className="font-display font-bold text-[19px] text-[#141414] pt-2">
        Why We Prioritize Independent Humanitarian Organizations
      </h2>
      <p>
        Many people have asked why VEconecta primarily highlights independent nonprofit
        organizations, humanitarian agencies, community organizations, and international relief
        groups rather than agencies directly affiliated with the Venezuelan government.
      </p>
      <p>
        The answer lies in Venezuela&apos;s recent history. For more than two decades, the country
        has experienced democratic backsliding, widespread corruption allegations, institutional
        weakening, economic collapse, and one of the largest displacement crises in the world.
        Numerous international organizations, including the United Nations, independent watchdogs,
        and humanitarian groups, have documented persistent concerns regarding transparency,
        accountability, and the politicization of public institutions. These conditions have
        significantly reduced public trust in state-managed aid distribution.
      </p>
      <p>
        For this reason, many Venezuelan civil society organizations, humanitarian experts, and
        members of the Venezuelan diaspora recommend supporting independent organizations with
        established records of transparency, financial accountability, and direct community
        engagement. These organizations often work alongside local volunteers, international
        partners, and affected communities to ensure that aid reaches those who need it most.
      </p>
      <p>
        VEconecta does not endorse any political movement or party. Our sole mission is
        humanitarian: to help people make informed decisions about where and how to contribute so
        that assistance reaches Venezuelans affected by this tragedy as efficiently, transparently,
        and responsibly as possible.
      </p>
    </div>
  )
}
```

- [ ] **Step 2: Manual verification**

Run `pnpm dev`, then:
- Visit `http://localhost:3000/es/sobre` — confirm both headings and all 6 paragraphs render, breadcrumb "Inicio › Sobre" works.
- Visit `http://localhost:3000/en/sobre` — confirm English content renders.
- Visit `http://localhost:3000/pt/sobre` — confirm it renders (falls back to the Spanish branch, per spec's accepted scope).

- [ ] **Step 3: Run `tsc`**

```bash
pnpm exec tsc --noEmit
```
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add "app/[locale]/sobre/page.tsx"
git commit -m "feat: add static Sobre page (mission + verification methodology)"
```

---

### Task 5: Public page `/[locale]/noticias` (list)

**Files:**
- Create: `app/[locale]/noticias/page.tsx`

**Interfaces:**
- Consumes: `prisma.post.findMany` (Task 1), `localizeBare` from `lib/locale-content.ts` (existing), `getTranslations('updates')` (Task 3).
- Produces: route `/[locale]/noticias`, each row links to `/${locale}/noticias/${post.slug}` (consumed by Task 6).

- [ ] **Step 1: Create the page**

```tsx
import Link from 'next/link'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { prisma } from '@/lib/prisma'
import { localizeBare, INTL_LOCALE, type Locale } from '@/lib/locale-content'
import type { Metadata } from 'next'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const isEn = locale === 'en'
  return {
    title: isEn ? 'News | VEconecta' : 'Noticias | VEconecta',
    openGraph: {
      type: 'website',
      siteName: 'VEconecta',
      images: [{ url: '/api/og', width: 1200, height: 630 }],
    },
  }
}

function excerpt(body: string): string {
  const firstParagraph = body.split('\n\n')[0]
  return firstParagraph.length > 180 ? firstParagraph.slice(0, 180).trimEnd() + '…' : firstParagraph
}

export default async function NoticiasPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('updates')
  const tNav = await getTranslations('nav')

  const posts = await prisma.post.findMany({
    where: { status: 'PUBLISHED' },
    orderBy: { publishedAt: 'desc' },
  })

  const intlLocale = INTL_LOCALE[locale as Locale] ?? INTL_LOCALE.es
  const fmt = (date: Date) =>
    new Intl.DateTimeFormat(intlLocale, { day: 'numeric', month: 'short', year: 'numeric' }).format(date)

  return (
    <main className="min-h-screen bg-white px-5 pt-8 pb-10">
      <nav className="flex items-center gap-1.5 mb-6 text-sm">
        <Link href={`/${locale}`} className="text-caribe hover:underline">
          {tNav('home')}
        </Link>
        <span className="text-[#b8b8b8]">›</span>
        <span className="text-[#141414]">{t('title')}</span>
      </nav>

      <h1 className="font-display font-extrabold text-[24px] leading-[1.15] tracking-[-0.01em] text-[#141414] mb-6">
        {t('title')}
      </h1>

      {posts.length === 0 ? (
        <p className="font-sans font-light text-[15px] text-[#808080]">{t('empty')}</p>
      ) : (
        <div className="divide-y divide-[rgba(20,20,20,0.08)] border-t border-[rgba(20,20,20,0.08)]">
          {posts.map((post) => (
            <Link
              key={post.id}
              href={`/${locale}/noticias/${post.slug}`}
              className="block py-5 hover:bg-guacamaya/5 transition-colors -mx-5 px-5"
            >
              <p className="font-sans font-light text-[13px] text-[#808080] mb-1">
                {post.publishedAt ? fmt(post.publishedAt) : ''}
              </p>
              <h2 className="font-display font-bold text-[17px] text-[#141414] mb-1.5">
                {localizeBare(post, 'title', locale)}
              </h2>
              <p className="font-sans font-light text-[14px] text-[#141414]/80 leading-relaxed">
                {excerpt(localizeBare(post, 'body', locale))}
              </p>
            </Link>
          ))}
        </div>
      )}
    </main>
  )
}
```

- [ ] **Step 2: Manual verification**

Run `pnpm dev`, visit `http://localhost:3000/es/noticias` — confirm the seeded "Sobre la crisis" post appears with a formatted date, title, and a truncated excerpt of the first paragraph (not the full 3 paragraphs). Click it — confirm it navigates to `/es/noticias/sobre-la-crisis` (404 is expected until Task 6 exists — that confirms the link `href` is correct).

- [ ] **Step 3: Run `tsc`**

```bash
pnpm exec tsc --noEmit
```
Expected: no errors (an unbuilt `/noticias/[slug]` route is not a type error).

- [ ] **Step 4: Commit**

```bash
git add "app/[locale]/noticias/page.tsx"
git commit -m "feat: add Noticias list page"
```

---

### Task 6: Public page `/[locale]/noticias/[slug]` (detail)

**Files:**
- Create: `app/[locale]/noticias/[slug]/page.tsx`

**Interfaces:**
- Consumes: `prisma.post.findUnique({ where: { slug } })`, `localizeBare` (existing), `getTranslations('updates')` (Task 3).
- Produces: route `/[locale]/noticias/[slug]`, linked from Task 5.

- [ ] **Step 1: Create the page**

```tsx
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { prisma } from '@/lib/prisma'
import { localizeBare, INTL_LOCALE, type Locale } from '@/lib/locale-content'
import type { Metadata } from 'next'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>
}): Promise<Metadata> {
  const { locale, slug } = await params
  const post = await prisma.post.findUnique({ where: { slug, status: 'PUBLISHED' } })
  if (!post) return {}
  const title = localizeBare(post, 'title', locale)
  return {
    title: `${title} | VEconecta`,
    openGraph: {
      type: 'website',
      siteName: 'VEconecta',
      title: `${title} | VEconecta`,
      images: [{ url: '/api/og', width: 1200, height: 630 }],
    },
  }
}

export default async function NoticiaDetailPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>
}) {
  const { locale, slug } = await params
  setRequestLocale(locale)
  const t = await getTranslations('updates')
  const tNav = await getTranslations('nav')

  const post = await prisma.post.findUnique({ where: { slug, status: 'PUBLISHED' } })
  if (!post) notFound()

  const intlLocale = INTL_LOCALE[locale as Locale] ?? INTL_LOCALE.es
  const fmt = (date: Date) =>
    new Intl.DateTimeFormat(intlLocale, { day: 'numeric', month: 'short', year: 'numeric' }).format(date)

  const title = localizeBare(post, 'title', locale)
  const body = localizeBare(post, 'body', locale)

  return (
    <main className="min-h-screen bg-white px-5 pt-8 pb-10">
      <nav className="flex items-center gap-1.5 mb-6 text-sm">
        <Link href={`/${locale}`} className="text-caribe hover:underline">
          {tNav('home')}
        </Link>
        <span className="text-[#b8b8b8]">›</span>
        <Link href={`/${locale}/noticias`} className="text-caribe hover:underline">
          {t('title')}
        </Link>
      </nav>

      <h1 className="font-display font-extrabold text-[24px] leading-[1.15] tracking-[-0.01em] text-[#141414] mb-1.5">
        {title}
      </h1>
      {post.publishedAt && (
        <p className="font-sans font-light text-[13px] text-[#808080] mb-6">
          {t('publishedOn', { date: fmt(post.publishedAt) })}
        </p>
      )}

      <div className="space-y-4 font-sans font-light text-[15px] text-[#141414] leading-relaxed whitespace-pre-line">
        {body}
      </div>

      <Link
        href={`/${locale}/noticias`}
        className="inline-block mt-8 font-sans text-[14px] text-caribe hover:underline"
      >
        ← {t('backToList')}
      </Link>
    </main>
  )
}
```

- [ ] **Step 2: Manual verification**

Run `pnpm dev`, visit `http://localhost:3000/es/noticias/sobre-la-crisis` — confirm title, formatted publish date, and all 3 paragraphs render with visible spacing between them (`whitespace-pre-line` respecting the `\n\n` from the seed). Visit `http://localhost:3000/es/noticias/no-existe` — confirm it 404s. Visit `http://localhost:3000/en/noticias/sobre-la-crisis` — confirm the English title "About the Crisis" and English body render.

- [ ] **Step 3: Run `tsc`**

```bash
pnpm exec tsc --noEmit
```
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add "app/[locale]/noticias/[slug]/page.tsx"
git commit -m "feat: add Noticias detail page"
```

---

### Task 7: Footer navigation links

**Files:**
- Modify: `components/AppFooter.tsx`

**Interfaces:**
- Consumes: `t('footer.about')`, `t('footer.news')` (Task 3); routes `/[locale]/sobre` (Task 4), `/[locale]/noticias` (Task 5).

- [ ] **Step 1: Add locale-aware links to the footer**

Replace the full contents of `components/AppFooter.tsx`:

```tsx
import { useTranslations, useLocale } from 'next-intl'
import Link from 'next/link'

export function AppFooter() {
  const t = useTranslations()
  const locale = useLocale()

  return (
    <footer className="border-t border-black/[0.08] px-5 py-6 flex flex-col items-center gap-3 text-center">
      <p className="font-sans font-light text-xs text-[#808080] leading-relaxed max-w-sm">
        {t('disclaimer')}
      </p>
      <p className="font-sans font-light text-xs text-[#808080] flex items-center gap-3">
        <Link href={`/${locale}/sobre`} className="hover:text-[#141414] transition-colors">
          {t('footer.about')}
        </Link>
        <span className="text-[#d0d0d0]">·</span>
        <Link href={`/${locale}/noticias`} className="hover:text-[#141414] transition-colors">
          {t('footer.news')}
        </Link>
      </p>
      <p className="font-sans font-light text-xs text-[#b8b8b8]">
        {t('footer.cta')}{' '}
        <a
          href="mailto:veconecta.org@gmail.com"
          className="underline underline-offset-2 hover:text-[#808080] transition-colors"
        >
          veconecta.org@gmail.com
        </a>
      </p>
    </footer>
  )
}
```

- [ ] **Step 2: Manual verification**

Run `pnpm dev`, load any public page (e.g. `/es`), scroll to the footer — confirm "Sobre · Noticias" links appear between the disclaimer and the email CTA, and both navigate correctly. Repeat on `/en`.

- [ ] **Step 3: Run `tsc`**

```bash
pnpm exec tsc --noEmit
```
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add components/AppFooter.tsx
git commit -m "feat: link Sobre and Noticias from the site footer"
```

---

### Task 8: Admin list page `/admin/updates`

**Files:**
- Create: `app/admin/(dashboard)/updates/page.tsx`

**Interfaces:**
- Consumes: `getSession` (`@/lib/lucia`), `prisma.post.findMany` (Task 1).
- Produces: route `/admin/updates`, "+ Nueva noticia" links to `/admin/updates/new` (Task 9), each row links to `/admin/updates/[id]` (Task 10).

- [ ] **Step 1: Create the page**

```tsx
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/lucia'
import { prisma } from '@/lib/prisma'

export default async function UpdatesPage() {
  const { user } = await getSession()
  if (!user) redirect('/admin/login')
  if (user.role !== 'ADMIN') redirect('/admin')

  const posts = await prisma.post.findMany({
    orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
  })

  return (
    <div>
      <nav className="flex items-center gap-2 mb-6 text-sm">
        <Link href="/admin" className="text-gray-400 hover:text-gray-700">Inicio</Link>
        <span className="text-gray-300">/</span>
        <span className="text-gray-900 font-medium">Noticias</span>
      </nav>

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-900">Noticias</h1>
        <Link
          href="/admin/updates/new"
          className="text-sm bg-gray-900 text-white px-4 py-2 rounded-lg hover:bg-gray-700"
        >
          + Nueva noticia
        </Link>
      </div>

      {posts.length === 0 ? (
        <p className="text-sm text-gray-500">Todavía no hay noticias.</p>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="grid grid-cols-[1fr_auto_auto] border-b border-gray-200 bg-gray-50 px-5 py-2.5">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Título</span>
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide text-center px-4">Estado</span>
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide text-center px-4">Slug</span>
          </div>

          {posts.map((post, i) => (
            <Link
              key={post.id}
              href={`/admin/updates/${post.id}`}
              className={`grid grid-cols-[1fr_auto_auto] px-5 py-3.5 items-center hover:bg-gray-50 transition-colors ${
                i < posts.length - 1 ? 'border-b border-gray-100' : ''
              }`}
            >
              <span className="text-sm text-gray-900 truncate">{post.title}</span>
              <div className="px-4 text-center">
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                  post.status === 'PUBLISHED'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-600'
                }`}>
                  {post.status === 'PUBLISHED' ? 'Publicado' : 'Borrador'}
                </span>
              </div>
              <span className="px-4 text-center text-xs text-gray-300 font-mono">{post.slug}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Manual verification**

Log in as ADMIN at `http://localhost:3000/admin/login`, visit `http://localhost:3000/admin/updates` — confirm the seeded "Sobre la crisis" post appears with a "Publicado" badge. Log in (or reuse a session) as an `EDITOR` user and visit the same URL directly — confirm it redirects to `/admin`.

- [ ] **Step 3: Run `tsc`**

```bash
pnpm exec tsc --noEmit
```
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add "app/admin/(dashboard)/updates/page.tsx"
git commit -m "feat: add admin Noticias list page"
```

---

### Task 9: Admin create page `/admin/updates/new`

**Files:**
- Create: `app/admin/(dashboard)/updates/new/page.tsx`

**Interfaces:**
- Consumes: `slugify` (Task 2), `logAction` with `action: 'POST_CREATE'`, `entityType: 'post'` (Task 2), `prisma.post.create`.
- Produces: on submit, redirects to `/admin/updates`.

- [ ] **Step 1: Create the page**

```tsx
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getSession } from '@/lib/lucia'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { slugify } from '@/lib/slugify'
import { logAction } from '@/lib/audit'
import { LOCALES } from '@/lib/locale-content'
import { PostStatus } from '@prisma/client'

export default async function NewUpdatePage() {
  const { user } = await getSession()
  if (!user) redirect('/admin/login')
  if (user.role !== 'ADMIN') redirect('/admin')

  async function create(fd: FormData) {
    'use server'
    const { user } = await getSession()
    if (!user || user.role !== 'ADMIN') return

    const title = (fd.get('title') as string).trim()
    const titleEn = (fd.get('titleEn') as string | null)?.trim() || null
    const body = (fd.get('body') as string).trim()
    const bodyEn = (fd.get('bodyEn') as string | null)?.trim() || null
    const status = (fd.get('status') as PostStatus) || PostStatus.DRAFT

    const baseSlug = slugify(title)
    let slug = baseSlug
    let suffix = 2
    while (await prisma.post.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${suffix}`
      suffix += 1
    }

    const post = await prisma.post.create({
      data: {
        slug,
        title,
        titleEn,
        body,
        bodyEn,
        status,
        publishedAt: status === PostStatus.PUBLISHED ? new Date() : null,
      },
    })

    await logAction({
      userEmail: user.email,
      action: 'POST_CREATE',
      entityType: 'post',
      entityId: post.id,
      entityName: post.title,
    })

    revalidatePath('/admin/updates')
    for (const l of LOCALES) revalidatePath(`/${l}/noticias`)
    redirect('/admin/updates')
  }

  return (
    <div className="max-w-2xl">
      <nav className="flex items-center gap-2 mb-6 text-sm">
        <Link href="/admin" className="text-gray-400 hover:text-gray-700">Inicio</Link>
        <span className="text-gray-300">/</span>
        <Link href="/admin/updates" className="text-gray-400 hover:text-gray-700">Noticias</Link>
        <span className="text-gray-300">/</span>
        <span className="text-gray-900 font-medium">Nueva noticia</span>
      </nav>

      <h1 className="text-xl font-bold text-gray-900 mb-6">Nueva noticia</h1>

      <form action={create} className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
        <F label="Título (español)" name="title" required />
        <F label="Título (inglés)" name="titleEn" />
        <TA label="Cuerpo (español)" name="body" required rows={8} />
        <TA label="Cuerpo (inglés)" name="bodyEn" rows={8} />

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
          <select
            name="status"
            defaultValue={PostStatus.DRAFT}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300"
          >
            <option value={PostStatus.DRAFT}>Borrador</option>
            <option value={PostStatus.PUBLISHED}>Publicado</option>
          </select>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Link href="/admin/updates" className="text-sm text-gray-600 hover:underline px-4 py-2">
            Cancelar
          </Link>
          <button
            type="submit"
            className="bg-red-700 text-white text-sm font-medium px-5 py-2 rounded-lg hover:bg-red-800"
          >
            Crear noticia
          </button>
        </div>
      </form>
    </div>
  )
}

function F({
  label, name, defaultValue = '', required = false,
}: {
  label: string; name: string; defaultValue?: string; required?: boolean
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        type="text"
        name={name}
        defaultValue={defaultValue}
        required={required}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300"
      />
    </div>
  )
}

function TA({
  label, name, defaultValue = '', required = false, rows = 3,
}: {
  label: string; name: string; defaultValue?: string; required?: boolean; rows?: number
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <textarea
        name={name}
        defaultValue={defaultValue}
        required={required}
        rows={rows}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300"
      />
    </div>
  )
}
```

- [ ] **Step 2: Manual verification**

Log in as ADMIN, visit `http://localhost:3000/admin/updates/new`:
- Create a post titled "Prueba" with only the Spanish title/body filled, status "Borrador" → confirm it lands in `/admin/updates` with a gray "Borrador" badge, and does **not** appear at `http://localhost:3000/es/noticias`.
- Create a second post titled "Prueba" again (same title) → confirm it's created without error (slug collision handled) — check in Prisma Studio that its slug is `prueba-2`.
- Edit that second one to "Publicado" status is covered in Task 10 — for now just confirm creation with status "Publicado" directly shows up at `/es/noticias` immediately.

- [ ] **Step 3: Run `tsc`**

```bash
pnpm exec tsc --noEmit
```
Expected: no errors.

- [ ] **Step 4: Delete the test posts created during manual verification**

Use `/admin/updates/[id]` once Task 10 lands, or `pnpm exec prisma studio` right now to delete the "Prueba"/"Prueba" rows so they don't linger as noise before Task 10 provides an in-app delete button.

- [ ] **Step 5: Commit**

```bash
git add "app/admin/(dashboard)/updates/new/page.tsx"
git commit -m "feat: add admin Noticias creation form"
```

---

### Task 10: Admin edit + delete page `/admin/updates/[id]`

**Files:**
- Create: `app/admin/(dashboard)/updates/[id]/page.tsx`

**Interfaces:**
- Consumes: `ConfirmButton` (`@/components/admin/ConfirmButton`, existing), `logAction` with `'POST_EDIT'`/`'POST_DELETE'` (Task 2), `prisma.post.update`/`.delete`.
- Produces: nothing consumed downstream — this is the last CRUD surface.

- [ ] **Step 1: Create the page**

```tsx
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { getSession } from '@/lib/lucia'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { logAction } from '@/lib/audit'
import { LOCALES } from '@/lib/locale-content'
import { ConfirmButton } from '@/components/admin/ConfirmButton'
import { PostStatus } from '@prisma/client'

export default async function EditUpdatePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const { user } = await getSession()
  if (!user) redirect('/admin/login')
  if (user.role !== 'ADMIN') redirect('/admin')

  const post = await prisma.post.findUnique({ where: { id } })
  if (!post) notFound()

  async function save(fd: FormData) {
    'use server'
    const { user } = await getSession()
    if (!user || user.role !== 'ADMIN') return
    if (!post) return

    const slug = (fd.get('slug') as string).trim()
    const title = (fd.get('title') as string).trim()
    const titleEn = (fd.get('titleEn') as string | null)?.trim() || null
    const body = (fd.get('body') as string).trim()
    const bodyEn = (fd.get('bodyEn') as string | null)?.trim() || null
    const status = (fd.get('status') as PostStatus) || PostStatus.DRAFT
    const isFirstPublish = status === PostStatus.PUBLISHED && post.publishedAt === null

    await prisma.post.update({
      where: { id },
      data: {
        slug,
        title,
        titleEn,
        body,
        bodyEn,
        status,
        publishedAt: isFirstPublish ? new Date() : undefined,
      },
    })

    await logAction({
      userEmail: user.email,
      action: 'POST_EDIT',
      entityType: 'post',
      entityId: id,
      entityName: title,
    })

    revalidatePath('/admin/updates')
    for (const l of LOCALES) revalidatePath(`/${l}/noticias`)
    for (const l of LOCALES) revalidatePath(`/${l}/noticias/${post.slug}`)
    if (slug !== post.slug) for (const l of LOCALES) revalidatePath(`/${l}/noticias/${slug}`)
    redirect('/admin/updates')
  }

  async function deletePost() {
    'use server'
    const { user } = await getSession()
    if (!user || user.role !== 'ADMIN') return
    if (!post) return

    await prisma.post.delete({ where: { id } })

    await logAction({
      userEmail: user.email,
      action: 'POST_DELETE',
      entityType: 'post',
      entityId: id,
      entityName: post.title,
    })

    revalidatePath('/admin/updates')
    for (const l of LOCALES) revalidatePath(`/${l}/noticias`)
    redirect('/admin/updates')
  }

  return (
    <div className="max-w-2xl">
      <nav className="flex items-center gap-2 mb-6 text-sm">
        <Link href="/admin" className="text-gray-400 hover:text-gray-700">Inicio</Link>
        <span className="text-gray-300">/</span>
        <Link href="/admin/updates" className="text-gray-400 hover:text-gray-700">Noticias</Link>
        <span className="text-gray-300">/</span>
        <span className="text-gray-900 font-medium">Editar</span>
      </nav>

      <h1 className="text-xl font-bold text-gray-900 mb-6">{post.title}</h1>

      <form action={save} className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
        <F label="Slug" name="slug" defaultValue={post.slug} required />
        <F label="Título (español)" name="title" defaultValue={post.title} required />
        <F label="Título (inglés)" name="titleEn" defaultValue={post.titleEn ?? ''} />
        <TA label="Cuerpo (español)" name="body" defaultValue={post.body} required rows={8} />
        <TA label="Cuerpo (inglés)" name="bodyEn" defaultValue={post.bodyEn ?? ''} rows={8} />

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
          <select
            name="status"
            defaultValue={post.status}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300"
          >
            <option value={PostStatus.DRAFT}>Borrador</option>
            <option value={PostStatus.PUBLISHED}>Publicado</option>
          </select>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Link href="/admin/updates" className="text-sm text-gray-600 hover:underline px-4 py-2">
            Cancelar
          </Link>
          <button
            type="submit"
            className="bg-red-700 text-white text-sm font-medium px-5 py-2 rounded-lg hover:bg-red-800"
          >
            Guardar cambios
          </button>
        </div>
      </form>

      <div className="mt-8 bg-white border border-red-100 rounded-xl p-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-gray-900">Eliminar noticia</p>
          <p className="text-xs text-gray-500">No se puede deshacer.</p>
        </div>
        <ConfirmButton
          action={deletePost}
          label="Eliminar noticia"
          message={`¿Eliminar "${post.title}" definitivamente?`}
          confirmLabel="Sí, eliminar"
        />
      </div>
    </div>
  )
}

function F({
  label, name, defaultValue = '', required = false,
}: {
  label: string; name: string; defaultValue?: string; required?: boolean
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        type="text"
        name={name}
        defaultValue={defaultValue}
        required={required}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300"
      />
    </div>
  )
}

function TA({
  label, name, defaultValue = '', required = false, rows = 3,
}: {
  label: string; name: string; defaultValue?: string; required?: boolean; rows?: number
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <textarea
        name={name}
        defaultValue={defaultValue}
        required={required}
        rows={rows}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300"
      />
    </div>
  )
}
```

- [ ] **Step 2: Manual verification**

Log in as ADMIN:
- Delete the two "Prueba"/"Prueba" test posts left over from Task 9 via this page's "Eliminar noticia" button (confirm dialog appears, confirming deletes and redirects to `/admin/updates`).
- Open the seeded "Sobre la crisis" post, change nothing, click "Guardar cambios" → confirm redirect back to the list, no crash.
- Change its status from "Publicado" to "Borrador" and save → confirm it disappears from `http://localhost:3000/es/noticias` and now 404s at `/es/noticias/sobre-la-crisis`. Change it back to "Publicado" and save → confirm it reappears (and that `publishedAt` in Prisma Studio did **not** change to a new timestamp, since it was already set).

- [ ] **Step 3: Run `tsc`**

```bash
pnpm exec tsc --noEmit
```
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add "app/admin/(dashboard)/updates/[id]/page.tsx"
git commit -m "feat: add admin Noticias edit and delete page"
```

---

### Task 11: Admin home navigation link

**Files:**
- Modify: `app/admin/(dashboard)/page.tsx`

**Interfaces:**
- Consumes: route `/admin/updates` (Task 8).

- [ ] **Step 1: Add the "Noticias" link**

In `app/admin/(dashboard)/page.tsx`, find this block (inside the `user.role === 'ADMIN' && (<>...)` fragment, alongside "Idiomas"/"Usuarios"/"Logs"):

```tsx
            {user.role === 'ADMIN' && (
              <>
                <Link
                  href="/admin/languages"
                  className="text-sm border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-100 whitespace-nowrap"
                >
                  Idiomas
                </Link>
                <Link
                  href="/admin/users"
                  className="text-sm border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-100 whitespace-nowrap"
                >
                  Usuarios
                </Link>
                <Link
                  href="/admin/activity"
                  className="text-sm border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-100 whitespace-nowrap"
                >
                  Logs
                </Link>
              </>
            )}
```

Replace it with (adds "Noticias" right after "Idiomas"):

```tsx
            {user.role === 'ADMIN' && (
              <>
                <Link
                  href="/admin/languages"
                  className="text-sm border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-100 whitespace-nowrap"
                >
                  Idiomas
                </Link>
                <Link
                  href="/admin/updates"
                  className="text-sm border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-100 whitespace-nowrap"
                >
                  Noticias
                </Link>
                <Link
                  href="/admin/users"
                  className="text-sm border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-100 whitespace-nowrap"
                >
                  Usuarios
                </Link>
                <Link
                  href="/admin/activity"
                  className="text-sm border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-100 whitespace-nowrap"
                >
                  Logs
                </Link>
              </>
            )}
```

- [ ] **Step 2: Manual verification**

Log in as ADMIN, visit `http://localhost:3000/admin` — confirm a "Noticias" button appears between "Idiomas" and "Usuarios" and navigates to `/admin/updates`. Log in as EDITOR — confirm the button does not appear (same guard as the other ADMIN-only buttons already there).

- [ ] **Step 3: Run full verification sweep**

```bash
pnpm exec tsc --noEmit
pnpm test
pnpm build
```
Expected: all three succeed. `pnpm build` will run `prisma migrate deploy` against the local dev database (already migrated in Task 1) and `next build` — this is the closest thing this project has to an end-to-end check (matches how prior sessions verified before considering work deployable; see `DT-7` for the one pre-existing local-only build failure unrelated to this change, caused by a missing `RESEND_API_KEY` in `.env`).

- [ ] **Step 4: Commit**

```bash
git add "app/admin/(dashboard)/page.tsx"
git commit -m "feat: link Noticias from the admin home dashboard"
```

---

## Self-Review Notes

- **Spec coverage:** every section of `docs/superpowers/specs/2026-07-05-sobre-noticias-design.md` maps to a task — data model (Task 1), `slugify` rename + audit (Task 2), i18n keys (Task 3), `/sobre` (Task 4), `/noticias` list (Task 5), `/noticias/[slug]` (Task 6), footer nav (Task 7), admin CRUD (Tasks 8–10), admin nav (Task 11).
- **Verbatim text:** Task 1's seed SQL and Task 4's `AboutContentEs`/`AboutContentEn` were copied character-for-character from `About the Crisis.txt` (re-checked against the original read during brainstorming), with only the one explicitly-flagged founder sentence added in Task 4.
- **Type consistency:** `PostStatus.DRAFT`/`PostStatus.PUBLISHED` used identically in Tasks 9, 10; `localizeBare(post, 'title'|'body', locale)` used identically in Tasks 5, 6; `logAction` calls in Tasks 9, 10 match the extended `AuditAction`/`entityType` unions from Task 2.
- **No placeholders:** all code blocks are complete and copy-pasteable; the one open variable (the actual migration folder timestamp in Task 1) is inherent to running `prisma migrate dev`, not a deferred decision.
