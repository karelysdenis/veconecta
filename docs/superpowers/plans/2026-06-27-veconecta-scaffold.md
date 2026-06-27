# VeConecta — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Scaffold VeConecta end-to-end: Next.js public site with country pages, Lucia + Prisma auth, admin panel with resource CRUD and publish workflow, seeded with Spain data.

**Architecture:** Next.js 14 App Router with next-intl for locale routing (/es, /en). Lucia v3 + PrismaAdapter for session auth (magic link via Resend, no passwords). Admin routes protected via layout-level session check. On publish, `revalidatePath` triggers ISR for public country pages.

**Tech Stack:** Next.js 14, Tailwind CSS, next-intl 3, Lucia v3, @lucia-auth/adapter-prisma, Prisma 5, PostgreSQL, Resend, Zod, pnpm

## Global Constraints

- Node.js 20+
- pnpm (not npm/yarn) — consistent with Nido monorepo patterns
- TypeScript strict mode throughout
- Tailwind mobile-first: always write mobile styles first, then `md:` breakpoints
- No passwords — auth is magic link only
- Public routes: zero auth required, zero JavaScript for rendering (SSR/SSG)
- All user-facing copy in messages/es.json and messages/en.json — never hardcoded strings in components
- `revalidatePath` must be called for both `/es/[country]` and `/en/[country]` on every publish

---

## File Map

```
veconecta/
├── .env.local                          # DATABASE_URL, RESEND_API_KEY, RESEND_FROM, NEXT_PUBLIC_URL
├── .env.example                        # Same keys, empty values
├── messages/
│   ├── es.json                         # All Spanish UI strings
│   └── en.json                         # All English UI strings
├── prisma/
│   ├── schema.prisma                   # User, Session, MagicToken, Country, Resource, CommunityReport
│   └── seed.ts                         # Spain + seed resources
├── lib/
│   ├── prisma.ts                       # Singleton PrismaClient
│   ├── lucia.ts                        # Lucia instance + getSession()
│   └── resend.ts                       # Resend client + sendMagicLink()
├── i18n.ts                             # next-intl getRequestConfig
├── middleware.ts                       # next-intl locale routing
├── app/
│   ├── [locale]/
│   │   ├── layout.tsx                  # NextIntlClientProvider
│   │   ├── page.tsx                    # Homepage: country selector grid
│   │   └── [country]/
│   │       └── page.tsx                # Country guide: all resource categories
│   ├── admin/
│   │   ├── layout.tsx                  # Auth gate: redirect to /admin/login if no session
│   │   ├── login/
│   │   │   └── page.tsx                # Magic link request form
│   │   ├── page.tsx                    # Dashboard: drafts queue + reports queue
│   │   └── [country]/
│   │       └── page.tsx                # Resource list + edit forms for one country
│   └── api/
│       ├── auth/
│       │   ├── magic-link/route.ts     # POST: generate + email token
│       │   ├── verify/route.ts         # GET: validate token, create session
│       │   └── logout/route.ts         # POST: invalidate session
│       ├── resources/
│       │   ├── route.ts                # POST: create resource (DRAFT)
│       │   └── [id]/
│       │       ├── route.ts            # PATCH: update, DELETE: archive
│       │       └── publish/route.ts    # POST: DRAFT→PUBLISHED + revalidatePath (ADMIN only)
│       └── reports/
│           └── route.ts                # POST: create CommunityReport (public)
└── components/
    ├── CountrySelector.tsx             # Grid of country cards linking to /[locale]/[country]
    ├── ActionCard.tsx                  # Collapsible section per resource category
    ├── ResourceLink.tsx                # Single resource row with badge + link/phone
    ├── VerificationBadge.tsx           # Green/amber/red badge based on verifiedAt + expiresAt
    └── DigitalBridgeTutorial.tsx       # Numbered steps tutorial, collapsible
```

---

### Task 1: Project init + dependencies

**Files:**
- Create: `package.json` (via create-next-app)
- Create: `.env.local`
- Create: `.env.example`

- [ ] **Step 1: Scaffold Next.js app**

Run from `C:/Users/34634/Projects/`:
```bash
pnpm create next-app@latest veconecta --typescript --tailwind --app --no-src-dir --import-alias "@/*" --no-eslint
cd veconecta
```

When prompted: App Router: Yes, everything else: defaults.

- [ ] **Step 2: Install dependencies**

```bash
pnpm add next-intl lucia @lucia-auth/adapter-prisma prisma @prisma/client resend zod
pnpm add -D @types/node tsx
```

- [ ] **Step 3: Create .env.local**

```bash
# .env.local
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/veconecta"
RESEND_API_KEY="re_xxxxxxxxxx"
RESEND_FROM="VeConecta <noreply@veconecta.org>"
NEXT_PUBLIC_URL="http://localhost:3000"
```

- [ ] **Step 4: Create .env.example**

```bash
DATABASE_URL=""
RESEND_API_KEY=""
RESEND_FROM="VeConecta <noreply@veconecta.org>"
NEXT_PUBLIC_URL="http://localhost:3000"
```

- [ ] **Step 5: Add .env.local to .gitignore**

Verify that `.env.local` is already in the generated `.gitignore`. If not, add it:
```
.env.local
```

- [ ] **Step 6: Clean up generated files**

`create-next-app` genera archivos que entran en conflicto con nuestra estructura. Borrar:

```bash
# Windows PowerShell
Remove-Item app/page.tsx
# app/layout.tsx se reemplaza en el siguiente paso — no borrar todavía
```

Crear `app/layout.tsx` como root passthrough (requerido por Next.js):

```typescript
// app/layout.tsx
// Next.js requiere un root layout. El <html> y <body> reales viven en app/[locale]/layout.tsx
// para poder usar lang={locale}. Este es el escape hatch estándar de next-intl.
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return children as any
}
```

- [ ] **Step 7: Fix next.config**

`create-next-app` puede generar `next.config.mjs` (ESM) o `next.config.js` (CJS). Verificar cuál existe y aplicar el formato correspondiente:

Si existe `next.config.mjs`:
```javascript
// next.config.mjs
import createNextIntlPlugin from 'next-intl/plugin'
const withNextIntl = createNextIntlPlugin('./i18n.ts')
export default withNextIntl({})
```

Si existe `next.config.js`:
```javascript
// next.config.js
const createNextIntlPlugin = require('next-intl/plugin')
const withNextIntl = createNextIntlPlugin('./i18n.ts')
module.exports = withNextIntl({})
```

- [ ] **Step 8: Verify app starts**

```bash
pnpm dev
```
Expected: Next.js running at http://localhost:3000 with default page.

- [ ] **Step 9: Commit**

```bash
git init
git add -A
git commit -m "feat: init Next.js + install dependencies"
```

---

### Task 2: Prisma schema + database

**Files:**
- Create: `prisma/schema.prisma`
- Create: `lib/prisma.ts`
- Create: `prisma/seed.ts`

**Produces:** `prisma` singleton used by all API routes and server components

- [ ] **Step 1: Initialize Prisma**

```bash
pnpm dlx prisma init --datasource-provider postgresql
```

Expected: creates `prisma/schema.prisma` and updates `.env` with DATABASE_URL placeholder. Move DATABASE_URL to `.env.local` if not already there.

- [ ] **Step 2: Write schema.prisma**

Replace the content of `prisma/schema.prisma`:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id          String    @id @default(cuid())
  email       String    @unique
  role        Role      @default(EDITOR)
  countrySlug String?
  isActive    Boolean   @default(true)
  createdAt   DateTime  @default(now())
  sessions    Session[]
}

model Session {
  id        String   @id
  userId    String
  expiresAt DateTime
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model MagicToken {
  id        String   @id @default(cuid())
  token     String   @unique
  email     String
  expiresAt DateTime
  createdAt DateTime @default(now())
}

model Country {
  slug          String     @id
  nameEs        String
  nameEn        String
  namePt        String?
  flag          String
  active        Boolean    @default(true)
  lastUpdatedAt DateTime   @updatedAt
  resources     Resource[]
}

model Resource {
  id          String           @id @default(cuid())
  countrySlug String
  country     Country          @relation(fields: [countrySlug], references: [slug])
  category    ResourceCategory
  name        String
  url         String?
  phone       String?
  bizum       String?
  free        Boolean          @default(false)
  notesEs     String?
  notesEn     String?
  notesPt     String?
  status      ResourceStatus   @default(DRAFT)
  verifiedAt  DateTime?
  verifiedBy  String?
  expiresAt   DateTime?
  createdAt   DateTime         @default(now())
  updatedAt   DateTime         @updatedAt
}

model CommunityReport {
  id          String   @id @default(cuid())
  resourceId  String?
  countrySlug String
  message     String
  url         String?
  resolved    Boolean  @default(false)
  createdAt   DateTime @default(now())
}

enum Role {
  ADMIN
  EDITOR
}

enum ResourceCategory {
  FIND_FAMILY
  DONATE_MONEY
  SEND_MONEY
  CALL_FREE
  DONATE_PHYSICALLY
  DIGITAL_BRIDGE
  CONSULAR
  MENTAL_HEALTH
}

enum ResourceStatus {
  DRAFT
  PUBLISHED
  ARCHIVED
}
```

- [ ] **Step 3: Create lib/prisma.ts**

```typescript
// lib/prisma.ts
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({ log: process.env.NODE_ENV === 'development' ? ['error'] : [] })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

- [ ] **Step 4: Run migration**

```bash
pnpm dlx prisma migrate dev --name init
```

Expected: migration file created in `prisma/migrations/`, database tables created.

- [ ] **Step 5: Create prisma/seed.ts**

```typescript
// prisma/seed.ts
import { PrismaClient, ResourceCategory, ResourceStatus } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Countries
  await prisma.country.createMany({
    data: [
      { slug: 'spain', nameEs: 'España', nameEn: 'Spain', namePt: 'Espanha', flag: '🇪🇸' },
      { slug: 'usa', nameEs: 'Estados Unidos', nameEn: 'United States', namePt: 'Estados Unidos', flag: '🇺🇸' },
      { slug: 'colombia', nameEs: 'Colombia', nameEn: 'Colombia', namePt: 'Colômbia', flag: '🇨🇴' },
      { slug: 'brazil', nameEs: 'Brasil', nameEn: 'Brazil', namePt: 'Brasil', flag: '🇧🇷' },
      { slug: 'argentina', nameEs: 'Argentina', nameEn: 'Argentina', namePt: 'Argentina', flag: '🇦🇷', active: false },
      { slug: 'peru', nameEs: 'Perú', nameEn: 'Peru', namePt: 'Peru', flag: '🇵🇪', active: false },
      { slug: 'chile', nameEs: 'Chile', nameEn: 'Chile', namePt: 'Chile', flag: '🇨🇱', active: false },
      { slug: 'mexico', nameEs: 'México', nameEn: 'Mexico', namePt: 'México', flag: '🇲🇽', active: false },
      { slug: 'ecuador', nameEs: 'Ecuador', nameEn: 'Ecuador', namePt: 'Equador', flag: '🇪🇨', active: false },
    ],
    skipDuplicates: true,
  })

  const now = new Date()
  const expiry = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000) // +14 días (umbral rojo)

  // Spain resources (verified by VeConecta — Mallorca)
  const spainResources = [
    {
      countrySlug: 'spain',
      category: ResourceCategory.FIND_FAMILY,
      name: 'Venezuela Te Busca',
      url: 'https://venezuelatebusca.com',
      notesEs: 'Base de datos centralizada con más de 50.000 reportes activos',
      notesEn: 'Centralized database with over 50,000 active reports',
      status: ResourceStatus.PUBLISHED,
      verifiedAt: now,
      verifiedBy: 'VeConecta',
      expiresAt: expiry,
    },
    {
      countrySlug: 'spain',
      category: ResourceCategory.FIND_FAMILY,
      name: 'Cruz Roja Española — Restablecimiento de Contacto',
      url: 'https://www.cruzroja.es',
      phone: '900 22 11 22',
      free: true,
      notesEs: 'Servicio gratuito para localizar familiares en zonas de desastre',
      notesEn: 'Free service to locate family members in disaster zones',
      status: ResourceStatus.PUBLISHED,
      verifiedAt: now,
      verifiedBy: 'VeConecta',
      expiresAt: expiry,
    },
    {
      countrySlug: 'spain',
      category: ResourceCategory.DONATE_MONEY,
      name: 'Cruz Roja Española',
      url: 'https://www2.cruzroja.es/-/ayuda-terremoto-venezuela-2026',
      bizum: '33512',
      notesEs: 'Canal verificado. Bizum 33512 o SMS "VENEZUELA" al 38092 (6€ automáticos)',
      notesEn: 'Verified channel. Bizum 33512 or SMS "VENEZUELA" to 38092 (€6 automatic)',
      status: ResourceStatus.PUBLISHED,
      verifiedAt: now,
      verifiedBy: 'VeConecta',
      expiresAt: expiry,
    },
    {
      countrySlug: 'spain',
      category: ResourceCategory.DONATE_MONEY,
      name: 'World Central Kitchen',
      url: 'https://wck.org',
      bizum: '03843',
      notesEs: 'Desplegada en Venezuela distribuyendo comidas. Bizum disponible desde España.',
      notesEn: 'Deployed in Venezuela distributing meals. Bizum available from Spain.',
      status: ResourceStatus.PUBLISHED,
      verifiedAt: now,
      verifiedBy: 'VeConecta',
      expiresAt: expiry,
    },
    {
      countrySlug: 'spain',
      category: ResourceCategory.SEND_MONEY,
      name: 'Fonmoney',
      url: 'https://fonmoney.com',
      notesEs: 'Opera desde cuentas bancarias españolas. Revisar tarifas actuales en su web.',
      notesEn: 'Works from Spanish bank accounts. Check current rates on their website.',
      status: ResourceStatus.PUBLISHED,
      verifiedAt: now,
      verifiedBy: 'VeConecta',
      expiresAt: expiry,
    },
    {
      countrySlug: 'spain',
      category: ResourceCategory.SEND_MONEY,
      name: 'Retorna',
      url: 'https://retorna.app',
      notesEs: 'App española para remesas a Venezuela. Alerta: han proliferado estafas — usar solo servicios con historial documentado.',
      notesEn: 'Spanish app for remittances to Venezuela. Warning: scams have proliferated — use only services with documented history.',
      status: ResourceStatus.PUBLISHED,
      verifiedAt: now,
      verifiedBy: 'VeConecta',
      expiresAt: expiry,
    },
    {
      countrySlug: 'spain',
      category: ResourceCategory.CALL_FREE,
      name: 'Movistar España',
      notesEs: 'Llamadas gratuitas a Venezuela habilitadas para clientes Movistar desde el 25 de junio.',
      notesEn: 'Free calls to Venezuela enabled for Movistar customers since June 25.',
      status: ResourceStatus.PUBLISHED,
      verifiedAt: now,
      verifiedBy: 'VeConecta',
      expiresAt: expiry,
    },
    {
      countrySlug: 'spain',
      category: ResourceCategory.CALL_FREE,
      name: 'MasOrange',
      notesEs: 'Llamadas gratuitas a Venezuela habilitadas para clientes MasOrange desde el 25 de junio.',
      notesEn: 'Free calls to Venezuela enabled for MasOrange customers since June 25.',
      status: ResourceStatus.PUBLISHED,
      verifiedAt: now,
      verifiedBy: 'VeConecta',
      expiresAt: expiry,
    },
    {
      countrySlug: 'spain',
      category: ResourceCategory.DONATE_PHYSICALLY,
      name: 'Fundación Madrina — Madrid',
      notesEs: 'Canalizado a través de la Diócesis de Caracas. Punto activo con envíos verificados.',
      notesEn: 'Channeled through the Diocese of Caracas. Active point with verified shipments.',
      status: ResourceStatus.PUBLISHED,
      verifiedAt: now,
      verifiedBy: 'VeConecta',
      expiresAt: expiry,
    },
    {
      countrySlug: 'spain',
      category: ResourceCategory.DONATE_PHYSICALLY,
      name: 'Asocaven — Barcelona',
      notesEs: 'Recogida de productos básicos. Confirmar horario antes de ir.',
      notesEn: 'Collection of basic products. Confirm hours before going.',
      status: ResourceStatus.PUBLISHED,
      verifiedAt: now,
      verifiedBy: 'VeConecta',
      expiresAt: expiry,
    },
    {
      countrySlug: 'spain',
      category: ResourceCategory.DONATE_PHYSICALLY,
      name: 'AVEC — Valencia',
      notesEs: 'Asociación Venezolanos Comunitat Valenciana. Coordinación con autoridades locales activa.',
      notesEn: 'Venezuelan Association of Valencia. Active coordination with local authorities.',
      status: ResourceStatus.PUBLISHED,
      verifiedAt: now,
      verifiedBy: 'VeConecta',
      expiresAt: expiry,
    },
    {
      countrySlug: 'spain',
      category: ResourceCategory.CONSULAR,
      name: 'Consulado de Venezuela en Madrid',
      url: 'https://embavenez.es',
      notesEs: 'Gestión de documentos de emergencia: certificados de defunción, pasaportes perdidos. Tiempos extendidos por colapso administrativo.',
      notesEn: 'Emergency documents: death certificates, lost passports. Extended processing times due to administrative overload.',
      status: ResourceStatus.PUBLISHED,
      verifiedAt: now,
      verifiedBy: 'VeConecta',
      expiresAt: expiry,
    },
    {
      countrySlug: 'spain',
      category: ResourceCategory.MENTAL_HEALTH,
      name: 'Teléfono de la Esperanza',
      phone: '717 003 717',
      free: true,
      notesEs: 'Crisis emocionales, 24 horas, gratuito desde cualquier operadora en España.',
      notesEn: 'Emotional crises, 24 hours, free from any carrier in Spain.',
      status: ResourceStatus.PUBLISHED,
      verifiedAt: now,
      verifiedBy: 'VeConecta',
      expiresAt: expiry,
    },
  ]

  for (const resource of spainResources) {
    await prisma.resource.create({ data: resource })
  }

  // Admin user
  await prisma.user.upsert({
    where: { email: 'admin@veconecta.org' },
    update: {},
    create: {
      email: 'admin@veconecta.org',
      role: 'ADMIN',
      isActive: true,
    },
  })

  console.log('Seed complete.')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
```

- [ ] **Step 6: Add seed script to package.json**

In `package.json`, add under `"scripts"`:
```json
"db:seed": "tsx prisma/seed.ts",
"db:reset": "pnpm dlx prisma migrate reset --force && pnpm db:seed"
```

- [ ] **Step 7: Run seed**

```bash
pnpm db:seed
```

Expected: "Seed complete."

- [ ] **Step 8: Commit**

```bash
git add prisma/ lib/prisma.ts package.json
git commit -m "feat: prisma schema, migration, seed with Spain data"
```

---

### Task 3: Lucia auth + magic link

**Files:**
- Create: `lib/lucia.ts`
- Create: `lib/resend.ts`
- Create: `app/api/auth/magic-link/route.ts`
- Create: `app/api/auth/verify/route.ts`
- Create: `app/api/auth/logout/route.ts`

**Produces:**
- `getSession()` — used by admin layout and all server components needing auth
- `POST /api/auth/magic-link` — accepts `{ email }`, sends magic link
- `GET /api/auth/verify?token=xxx` — validates token, creates session, redirects
- `POST /api/auth/logout` — destroys session

- [ ] **Step 1: Write lib/lucia.ts**

```typescript
// lib/lucia.ts
import { Lucia } from 'lucia'
import { PrismaAdapter } from '@lucia-auth/adapter-prisma'
import { prisma } from './prisma'
import { cookies } from 'next/headers'
import { cache } from 'react'

const adapter = new PrismaAdapter(prisma.session, prisma.user)

export const lucia = new Lucia(adapter, {
  sessionCookie: {
    attributes: {
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    },
  },
  getUserAttributes: (attributes) => ({
    email: attributes.email,
    role: attributes.role,
    countrySlug: attributes.countrySlug,
    isActive: attributes.isActive,
  }),
})

declare module 'lucia' {
  interface Register {
    Lucia: typeof lucia
    DatabaseUserAttributes: {
      email: string
      role: 'ADMIN' | 'EDITOR'
      countrySlug: string | null
      isActive: boolean
    }
  }
}

export const getSession = cache(async () => {
  const sessionId = cookies().get(lucia.sessionCookieName)?.value ?? null
  if (!sessionId) return { user: null, session: null }

  const result = await lucia.validateSession(sessionId)

  try {
    if (result.session?.fresh) {
      const cookie = lucia.createSessionCookie(result.session.id)
      cookies().set(cookie.name, cookie.value, cookie.attributes)
    }
    if (!result.session) {
      const cookie = lucia.createBlankSessionCookie()
      cookies().set(cookie.name, cookie.value, cookie.attributes)
    }
  } catch {}

  return result
})
```

- [ ] **Step 2: Write lib/resend.ts**

```typescript
// lib/resend.ts
import { Resend } from 'resend'

export const resend = new Resend(process.env.RESEND_API_KEY)

export async function sendMagicLink(email: string, token: string) {
  const url = `${process.env.NEXT_PUBLIC_URL}/api/auth/verify?token=${token}`

  await resend.emails.send({
    from: process.env.RESEND_FROM!,
    to: email,
    subject: 'Tu enlace de acceso a VeConecta',
    html: `
      <p>Hola,</p>
      <p>Haz clic en el enlace para acceder al panel de VeConecta. Válido por 15 minutos.</p>
      <p><a href="${url}" style="background:#dc2626;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block;">Acceder al panel</a></p>
      <p style="color:#6b7280;font-size:12px;">Si no solicitaste este enlace, ignora este email.</p>
    `,
  })
}
```

- [ ] **Step 3: Write magic-link route**

```typescript
// app/api/auth/magic-link/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { sendMagicLink } from '@/lib/resend'

const schema = z.object({ email: z.string().email() })

function generateToken(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Email inválido' }, { status: 400 })

  const { email } = parsed.data

  // Only registered users can receive magic links
  const user = await prisma.user.findUnique({ where: { email } })
  if (!user || !user.isActive) {
    // Return 200 to avoid email enumeration
    return NextResponse.json({ ok: true })
  }

  // Invalidate old tokens for this email
  await prisma.magicToken.deleteMany({ where: { email } })

  const token = generateToken()
  await prisma.magicToken.create({
    data: {
      token,
      email,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 min
    },
  })

  await sendMagicLink(email, token)
  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 4: Write verify route**

```typescript
// app/api/auth/verify/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { lucia } from '@/lib/lucia'
import { cookies } from 'next/headers'

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')
  if (!token) return NextResponse.redirect(new URL('/admin/login?error=invalid', req.url))

  const magicToken = await prisma.magicToken.findUnique({ where: { token } })

  if (!magicToken || magicToken.expiresAt < new Date()) {
    await prisma.magicToken.deleteMany({ where: { token } })
    return NextResponse.redirect(new URL('/admin/login?error=expired', req.url))
  }

  const user = await prisma.user.findUnique({ where: { email: magicToken.email } })
  if (!user || !user.isActive) {
    return NextResponse.redirect(new URL('/admin/login?error=invalid', req.url))
  }

  await prisma.magicToken.delete({ where: { token } })

  const session = await lucia.createSession(user.id, {})
  const sessionCookie = lucia.createSessionCookie(session.id)
  cookies().set(sessionCookie.name, sessionCookie.value, sessionCookie.attributes)

  return NextResponse.redirect(new URL('/admin', req.url))
}
```

- [ ] **Step 5: Write logout route**

```typescript
// app/api/auth/logout/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { lucia, getSession } from '@/lib/lucia'
import { cookies } from 'next/headers'

export async function POST(req: NextRequest) {
  const { session } = await getSession()
  if (session) {
    await lucia.invalidateSession(session.id)
    const blank = lucia.createBlankSessionCookie()
    cookies().set(blank.name, blank.value, blank.attributes)
  }
  return NextResponse.redirect(new URL('/admin/login', req.url))
}
```

- [ ] **Step 6: Commit**

```bash
git add lib/lucia.ts lib/resend.ts app/api/auth/
git commit -m "feat: lucia auth with magic link via Resend"
```

---

### Task 4: next-intl configuration + messages

**Files:**
- Create: `i18n.ts`
- Modify: `middleware.ts`
- Create: `messages/es.json`
- Create: `messages/en.json`

**Produces:** `useTranslations('namespace')` available in all components under `app/[locale]/`

- [ ] **Step 1: Write i18n.ts**

```typescript
// i18n.ts
import { notFound } from 'next/navigation'
import { getRequestConfig } from 'next-intl/server'

export const locales = ['es', 'en'] as const
export type Locale = (typeof locales)[number]
export const defaultLocale: Locale = 'es'

export default getRequestConfig(async ({ locale }) => {
  if (!locales.includes(locale as Locale)) notFound()
  return {
    messages: (await import(`./messages/${locale}.json`)).default,
  }
})
```

- [ ] **Step 2: Write middleware.ts**

```typescript
// middleware.ts
import createMiddleware from 'next-intl/middleware'
import { locales, defaultLocale } from './i18n'

export default createMiddleware({
  locales,
  defaultLocale,
  localeDetection: true,
})

export const config = {
  matcher: ['/((?!api|admin|_next|_vercel|.*\\..*).*)'],
}
```

Note: `/admin` is excluded from locale middleware — it runs its own auth middleware.

- [ ] **Step 3: Write messages/es.json**

```json
{
  "site": {
    "name": "VeConecta",
    "tagline": "La diáspora venezolana conectada"
  },
  "homepage": {
    "title": "¿Desde dónde quieres ayudar?",
    "subtitle": "Selecciona tu país de residencia para ver recursos verificados",
    "emergencyBanner": "Terremoto Venezuela — Recursos verificados para la diáspora"
  },
  "categories": {
    "FIND_FAMILY": "Buscar familiares",
    "DONATE_MONEY": "Donar dinero",
    "SEND_MONEY": "Enviar dinero a familia",
    "CALL_FREE": "Llamar gratis a Venezuela",
    "DONATE_PHYSICALLY": "Donar físicamente",
    "DIGITAL_BRIDGE": "Ser puente digital",
    "CONSULAR": "Trámites consulares",
    "MENTAL_HEALTH": "Apoyo psicológico"
  },
  "verification": {
    "verified": "Verificado",
    "unverified": "Sin verificar reciente",
    "expired": "Verificación vencida — confirmar antes de usar",
    "lastChecked": "Última verificación: {date}",
    "reportError": "¿Info desactualizada? Repórtalo"
  },
  "resource": {
    "visit": "Visitar",
    "call": "Llamar",
    "bizum": "Bizum: {code}",
    "free": "Gratuito"
  },
  "digitalBridge": {
    "title": "Cómo ser puente digital",
    "subtitle": "Si tienes conexión estable, puedes ayudar a familiares sin internet en Venezuela",
    "step1": "Cuando te llame un familiar desde Venezuela, pide estos datos antes de que se corte: nombre completo, cédula, última ubicación conocida, descripción física, ropa que llevaba.",
    "step2": "Antes de crear un reporte, busca primero en venezuelatebusca.com y desaparecidosterremotovenezuela.com por nombre y cédula. Evita duplicados — saturan el sistema.",
    "step3": "Si no aparece, crea el reporte en venezuelatebusca.com. Sube foto si tienes. El registro es inmediato.",
    "step4": "Comparte el link del reporte con todos los grupos de WhatsApp familiares.",
    "step5": "Cuando la persona sea localizada, márcala como encontrada. Eso libera capacidad para quienes siguen sin aparecer."
  },
  "report": {
    "title": "Reportar información desactualizada",
    "placeholder": "Describe qué información está desactualizada o incorrecta",
    "submit": "Enviar reporte",
    "success": "Gracias. Revisaremos tu reporte en las próximas horas.",
    "error": "Error al enviar. Inténtalo de nuevo."
  },
  "disclaimer": "VeConecta es una iniciativa ciudadana independiente. Verificamos la información antes de publicarla, pero los recursos cambian rápido. Confirma siempre antes de actuar.",
  "country": {
    "lastUpdated": "Actualizado: {date}",
    "noResources": "Recursos en preparación — vuelve pronto."
  }
}
```

- [ ] **Step 4: Write messages/en.json**

```json
{
  "site": {
    "name": "VeConecta",
    "tagline": "The Venezuelan diaspora, connected"
  },
  "homepage": {
    "title": "Where are you helping from?",
    "subtitle": "Select your country of residence to see verified local resources",
    "emergencyBanner": "Venezuela Earthquake — Verified resources for the diaspora"
  },
  "categories": {
    "FIND_FAMILY": "Find family members",
    "DONATE_MONEY": "Donate money",
    "SEND_MONEY": "Send money to family",
    "CALL_FREE": "Call Venezuela for free",
    "DONATE_PHYSICALLY": "Donate supplies",
    "DIGITAL_BRIDGE": "Be a digital bridge",
    "CONSULAR": "Consular services",
    "MENTAL_HEALTH": "Mental health support"
  },
  "verification": {
    "verified": "Verified",
    "unverified": "Not recently verified",
    "expired": "Verification expired — confirm before acting",
    "lastChecked": "Last verified: {date}",
    "reportError": "Info outdated? Report it"
  },
  "resource": {
    "visit": "Visit",
    "call": "Call",
    "bizum": "Bizum: {code}",
    "free": "Free"
  },
  "digitalBridge": {
    "title": "How to be a digital bridge",
    "subtitle": "If you have a stable connection, you can help family members with no internet in Venezuela",
    "step1": "When a family member calls from Venezuela, get these details before the call drops: full name, ID number, last known location, physical description, what they were wearing.",
    "step2": "Before creating a report, search first at venezuelatebusca.com and desaparecidosterremotovenezuela.com by name and ID. Avoid duplicates — they saturate the system.",
    "step3": "If they don't appear, create a report at venezuelatebusca.com. Upload a photo if you have one. Registration is immediate.",
    "step4": "Share the report link with all family WhatsApp groups.",
    "step5": "When the person is found, mark them as located. This frees up capacity for those still missing."
  },
  "report": {
    "title": "Report outdated information",
    "placeholder": "Describe what information is outdated or incorrect",
    "submit": "Send report",
    "success": "Thank you. We'll review your report within a few hours.",
    "error": "Error sending. Please try again."
  },
  "disclaimer": "VeConecta is an independent citizen initiative. We verify information before publishing, but resources change fast. Always confirm before acting.",
  "country": {
    "lastUpdated": "Updated: {date}",
    "noResources": "Resources in preparation — check back soon."
  }
}
```

- [ ] **Step 5: Update next.config to load next-intl plugin**

El plugin ya fue añadido en Task 1 Step 7. Verificar que `withNextIntl` esté correctamente aplicado. No hay acción adicional aquí.

- [ ] **Step 6: Commit**

```bash
git add i18n.ts middleware.ts messages/
git commit -m "feat: next-intl setup with ES/EN messages"
```

---

### Task 5: Public site — homepage + country page

**Files:**
- Create: `app/[locale]/layout.tsx`
- Create: `app/[locale]/page.tsx`
- Create: `app/[locale]/[country]/page.tsx`
- Create: `components/CountrySelector.tsx`
- Create: `components/ActionCard.tsx`
- Create: `components/ResourceLink.tsx`
- Create: `components/VerificationBadge.tsx`
- Create: `components/DigitalBridgeTutorial.tsx`

**Produces:** Public-facing site rendering Spain data from DB, in /es and /en

- [ ] **Step 1: Write app/[locale]/layout.tsx**

```typescript
// app/[locale]/layout.tsx
import { NextIntlClientProvider } from 'next-intl'
import { getMessages } from 'next-intl/server'
import { locales } from '@/i18n'
import type { ReactNode } from 'react'
import '../globals.css' // Tailwind directives — obligatorio aquí porque root layout es passthrough

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }))
}

export default async function LocaleLayout({
  children,
  params: { locale },
}: {
  children: ReactNode
  params: { locale: string }
}) {
  const messages = await getMessages()
  return (
    <html lang={locale}>
      <body className="bg-white text-gray-900 antialiased">
        <NextIntlClientProvider messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
```

- [ ] **Step 2: Write components/VerificationBadge.tsx**

Nota de implementación: `verifiedAt` y `expiresAt` llegan como `string | null` en runtime (Next.js serializa Date→ISO string al cruzar Server→Client boundary). El tipo acepta ambos para no mentir.

Lógica de badge per spec (PROYECTO.md):
- Verde: 0–5 días desde verifiedAt
- Ámbar: 5–14 días
- Rojo: +14 días o sin verifiedAt

`expiresAt` NO se usa para el badge — solo para lógica de admin (scheduled jobs, etc).

```typescript
// components/VerificationBadge.tsx
import { useTranslations } from 'next-intl'

type BadgeStatus = 'verified' | 'unverified' | 'expired'

function getBadgeStatus(verifiedAt: Date | string | null): BadgeStatus {
  if (!verifiedAt) return 'expired'
  const verifiedDate = typeof verifiedAt === 'string' ? new Date(verifiedAt) : verifiedAt
  const daysSince = (Date.now() - verifiedDate.getTime()) / (1000 * 60 * 60 * 24)
  if (daysSince <= 5) return 'verified'
  if (daysSince <= 14) return 'unverified'
  return 'expired'
}

const statusStyles: Record<BadgeStatus, string> = {
  verified: 'bg-green-100 text-green-800',
  unverified: 'bg-amber-100 text-amber-800',
  expired: 'bg-red-100 text-red-800',
}

export function VerificationBadge({
  verifiedAt,
}: {
  verifiedAt: Date | string | null
}) {
  const t = useTranslations('verification')
  const status = getBadgeStatus(verifiedAt)
  const dateStr = verifiedAt
    ? new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short' }).format(
        typeof verifiedAt === 'string' ? new Date(verifiedAt) : verifiedAt
      )
    : null

  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${statusStyles[status]}`}>
      {status === 'verified' && dateStr ? t('lastChecked', { date: dateStr }) : t(status)}
    </span>
  )
}
```

- [ ] **Step 3: Write components/ResourceLink.tsx**

```typescript
// components/ResourceLink.tsx
import { useTranslations } from 'next-intl'
import { VerificationBadge } from './VerificationBadge'
import type { Resource } from '@prisma/client'

type Locale = 'es' | 'en' | 'pt'

function getNotes(resource: Resource, locale: Locale): string | null {
  if (locale === 'en') return resource.notesEn
  if (locale === 'pt') return resource.notesPt
  return resource.notesEs
}

export function ResourceLink({
  resource,
  locale,
}: {
  resource: Resource
  locale: Locale
}) {
  const t = useTranslations('resource')
  const notes = getNotes(resource, locale)

  return (
    <div className="border-l-4 border-red-200 pl-3 py-2">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="font-medium text-gray-900 text-sm">{resource.name}</p>
          {notes && <p className="text-gray-600 text-xs mt-0.5">{notes}</p>}
          {resource.bizum && (
            <p className="text-gray-700 text-xs mt-0.5 font-mono">{t('bizum', { code: resource.bizum })}</p>
          )}
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <VerificationBadge verifiedAt={resource.verifiedAt} />
          <div className="flex gap-1.5">
            {resource.free && (
              <span className="text-xs text-green-700 font-medium">{t('free')}</span>
            )}
            {resource.url && (
              <a
                href={resource.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-red-700 underline font-medium"
              >
                {t('visit')}
              </a>
            )}
            {resource.phone && (
              <a href={`tel:${resource.phone}`} className="text-xs text-red-700 underline font-medium">
                {t('call')}
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Write components/DigitalBridgeTutorial.tsx**

```typescript
// components/DigitalBridgeTutorial.tsx
'use client'
import { useState } from 'react'
import { useTranslations } from 'next-intl'

export function DigitalBridgeTutorial() {
  const [open, setOpen] = useState(false)
  const t = useTranslations('digitalBridge')

  const steps = [t('step1'), t('step2'), t('step3'), t('step4'), t('step5')]

  return (
    <div className="border border-blue-200 rounded-lg bg-blue-50">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-4 text-left"
      >
        <div>
          <p className="font-semibold text-blue-900 text-sm">{t('title')}</p>
          {!open && <p className="text-blue-700 text-xs mt-0.5">{t('subtitle')}</p>}
        </div>
        <span className="text-blue-700 text-lg shrink-0 ml-2">{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="px-4 pb-4">
          <p className="text-blue-700 text-xs mb-3">{t('subtitle')}</p>
          <ol className="space-y-2">
            {steps.map((step, i) => (
              <li key={i} className="flex gap-2 text-sm text-blue-900">
                <span className="bg-blue-700 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs shrink-0 mt-0.5">
                  {i + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 5: Write components/ActionCard.tsx**

```typescript
// components/ActionCard.tsx
'use client'
import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { ResourceLink } from './ResourceLink'
import { DigitalBridgeTutorial } from './DigitalBridgeTutorial'
import type { Resource, ResourceCategory } from '@prisma/client'

const categoryIcons: Record<ResourceCategory, string> = {
  FIND_FAMILY: '🔴',
  DONATE_MONEY: '💸',
  SEND_MONEY: '💱',
  CALL_FREE: '📞',
  DONATE_PHYSICALLY: '📦',
  DIGITAL_BRIDGE: '🌉',
  CONSULAR: '🏛',
  MENTAL_HEALTH: '🧠',
}

export function ActionCard({
  category,
  resources,
  locale,
}: {
  category: ResourceCategory
  resources: Resource[]
  locale: 'es' | 'en' | 'pt'
}) {
  const [open, setOpen] = useState(category === 'FIND_FAMILY')
  const t = useTranslations('categories')

  if (category === 'DIGITAL_BRIDGE') {
    return (
      <div className="py-1">
        <DigitalBridgeTutorial />
      </div>
    )
  }

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-4 text-left bg-gray-50 hover:bg-gray-100 transition-colors"
      >
        <span className="font-semibold text-gray-900 text-sm flex items-center gap-2">
          <span>{categoryIcons[category]}</span>
          {t(category)}
          {resources.length > 0 && (
            <span className="text-xs font-normal text-gray-500">({resources.length})</span>
          )}
        </span>
        <span className="text-gray-400 text-sm">{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="p-4 space-y-3">
          {resources.length === 0 ? (
            <p className="text-gray-500 text-sm">En preparación.</p>
          ) : (
            resources.map((r) => <ResourceLink key={r.id} resource={r} locale={locale} />)
          )}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 6: Write components/CountrySelector.tsx**

```typescript
// components/CountrySelector.tsx
import Link from 'next/link'
import type { Country } from '@prisma/client'

export function CountrySelector({
  countries,
  locale,
}: {
  countries: Country[]
  locale: string
}) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
      {countries.map((country) => {
        const name = locale === 'en' ? country.nameEn : locale === 'pt' ? (country.namePt ?? country.nameEs) : country.nameEs
        return (
          <Link
            key={country.slug}
            href={`/${locale}/${country.slug}`}
            className="flex flex-col items-center justify-center gap-2 rounded-xl border border-gray-200 p-4 hover:border-red-300 hover:bg-red-50 transition-colors text-center"
          >
            <span className="text-4xl">{country.flag}</span>
            <span className="text-sm font-medium text-gray-900">{name}</span>
          </Link>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 7: Write app/[locale]/page.tsx**

```typescript
// app/[locale]/page.tsx
import { useTranslations } from 'next-intl'
import { prisma } from '@/lib/prisma'
import { CountrySelector } from '@/components/CountrySelector'

export default async function HomePage({ params: { locale } }: { params: { locale: string } }) {
  const t = useTranslations('homepage')
  const countries = await prisma.country.findMany({
    where: { active: true },
    orderBy: { slug: 'asc' },
  })

  return (
    <main className="min-h-screen bg-white">
      <div className="bg-red-700 text-white py-3 px-4 text-center text-sm font-medium">
        {t('emergencyBanner')}
      </div>
      <div className="max-w-2xl mx-auto px-4 py-10">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">{t('title')}</h1>
        <p className="text-gray-600 mb-8">{t('subtitle')}</p>
        <CountrySelector countries={countries} locale={locale} />
      </div>
    </main>
  )
}
```

- [ ] **Step 8: Write app/[locale]/[country]/page.tsx**

```typescript
// app/[locale]/[country]/page.tsx
import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { prisma } from '@/lib/prisma'
import { ActionCard } from '@/components/ActionCard'
import { ResourceCategory, ResourceStatus } from '@prisma/client'
import type { Metadata } from 'next'

const CATEGORY_ORDER: ResourceCategory[] = [
  'FIND_FAMILY',
  'CALL_FREE',
  'DONATE_MONEY',
  'SEND_MONEY',
  'DONATE_PHYSICALLY',
  'DIGITAL_BRIDGE',
  'CONSULAR',
  'MENTAL_HEALTH',
]

type Props = { params: { locale: string; country: string } }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const country = await prisma.country.findUnique({ where: { slug: params.country } })
  if (!country) return {}

  const name = params.locale === 'en' ? country.nameEn : country.nameEs
  const isEn = params.locale === 'en'

  return {
    title: isEn
      ? `From ${name}: How to help with the Venezuela earthquake | VeConecta`
      : `Desde ${name}: Cómo ayudar con el terremoto de Venezuela | VeConecta`,
    description: isEn
      ? `Verified donation channels, free calls, and how to find missing family from ${name}. Updated resources for Venezuelans.`
      : `Recursos verificados para venezolanos en ${name}: donaciones, llamadas gratis, búsqueda de familiares.`,
    openGraph: {
      type: 'website',
      siteName: 'VeConecta',
      images: [{ url: '/og-image.png', width: 1200, height: 630 }],
    },
  }
}

export default async function CountryPage({ params }: Props) {
  const { locale, country: slug } = params
  const t = await getTranslations('country')
  const tCategories = await getTranslations('categories')
  const tDisclaimer = await getTranslations()

  const country = await prisma.country.findUnique({
    where: { slug, active: true },
    include: {
      resources: {
        where: { status: ResourceStatus.PUBLISHED },
        orderBy: { createdAt: 'asc' },
      },
    },
  })

  if (!country) notFound()

  const name = locale === 'en' ? country.nameEn : locale === 'pt' ? (country.namePt ?? country.nameEs) : country.nameEs
  const resourcesByCategory = CATEGORY_ORDER.reduce((acc, cat) => {
    acc[cat] = country.resources.filter(r => r.category === cat)
    return acc
  }, {} as Record<ResourceCategory, typeof country.resources>)

  const lastUpdated = country.lastUpdatedAt
    ? new Intl.DateTimeFormat(locale === 'en' ? 'en-US' : 'es-ES', { day: 'numeric', month: 'long' }).format(country.lastUpdatedAt)
    : null

  return (
    <main className="min-h-screen bg-white">
      <div className="bg-red-700 text-white py-3 px-4 text-center text-sm font-medium">
        VeConecta — {country.flag} {name}
      </div>
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-xl font-bold text-gray-900">
            {locale === 'en' ? `From ${name}` : `Desde ${name}`}
          </h1>
          {lastUpdated && (
            <span className="text-xs text-gray-500">{t('lastUpdated', { date: lastUpdated })}</span>
          )}
        </div>
        <p className="text-gray-600 text-sm mb-6">
          {locale === 'en'
            ? 'Here\'s what you can do right now:'
            : 'Esto es lo que puedes hacer ahora mismo:'}
        </p>

        <div className="space-y-2">
          {CATEGORY_ORDER.map((category) => (
            <ActionCard
              key={category}
              category={category}
              resources={resourcesByCategory[category] ?? []}
              locale={locale as 'es' | 'en' | 'pt'}
            />
          ))}
        </div>

        <div className="mt-8 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <p className="text-xs text-gray-500">{tDisclaimer('disclaimer')}</p>
        </div>
      </div>
    </main>
  )
}
```

- [ ] **Step 9: Test public pages**

```bash
pnpm dev
```

Navigate to:
- http://localhost:3000 → should redirect to /es
- http://localhost:3000/es → country selector grid with 4 active flags
- http://localhost:3000/es/spain → Spain resources with VerificationBadge, ActionCards
- http://localhost:3000/en/spain → same in English

- [ ] **Step 10: Commit**

```bash
git add components/ app/[locale]/
git commit -m "feat: public homepage and country page with Spain data"
```

---

### Task 6: Community report form + API

**Files:**
- Create: `components/ReportForm.tsx`
- Create: `app/api/reports/route.ts`

**Produces:** `POST /api/reports` stores CommunityReport in DB; form embedded in country pages

- [ ] **Step 1: Write app/api/reports/route.ts**

```typescript
// app/api/reports/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'

const schema = z.object({
  countrySlug: z.string().min(1),
  message: z.string().min(5).max(500),
  url: z.string().url().optional().or(z.literal('')),
  resourceId: z.string().optional(),
})

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid data' }, { status: 400 })

  await prisma.communityReport.create({
    data: {
      countrySlug: parsed.data.countrySlug,
      message: parsed.data.message,
      url: parsed.data.url || null,
      resourceId: parsed.data.resourceId || null,
    },
  })

  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 2: Write components/ReportForm.tsx**

```typescript
// components/ReportForm.tsx
'use client'
import { useState } from 'react'
import { useTranslations } from 'next-intl'

export function ReportForm({ countrySlug }: { countrySlug: string }) {
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const t = useTranslations('report')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!message.trim()) return
    setStatus('loading')
    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ countrySlug, message }),
      })
      if (!res.ok) throw new Error()
      setStatus('success')
      setMessage('')
    } catch {
      setStatus('error')
    }
  }

  return (
    <div className="mt-6 border-t border-gray-100 pt-4">
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="text-xs text-gray-500 underline hover:text-gray-700"
        >
          {t('title')}
        </button>
      ) : status === 'success' ? (
        <p className="text-xs text-green-700">{t('success')}</p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-2">
          <label className="block text-xs font-medium text-gray-700">{t('title')}</label>
          <textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder={t('placeholder')}
            rows={3}
            className="w-full text-sm border border-gray-300 rounded-lg p-2 resize-none focus:outline-none focus:ring-2 focus:ring-red-300"
          />
          {status === 'error' && <p className="text-xs text-red-600">{t('error')}</p>}
          <button
            type="submit"
            disabled={status === 'loading' || !message.trim()}
            className="text-sm bg-red-700 text-white px-4 py-1.5 rounded-lg disabled:opacity-50"
          >
            {status === 'loading' ? '...' : t('submit')}
          </button>
        </form>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Add ReportForm to country page**

In `app/[locale]/[country]/page.tsx`, add after the disclaimer section:

```typescript
import { ReportForm } from '@/components/ReportForm'

// After the disclaimer div:
<ReportForm countrySlug={slug} />
```

- [ ] **Step 4: Commit**

```bash
git add components/ReportForm.tsx app/api/reports/ app/[locale]/[country]/page.tsx
git commit -m "feat: community report form + API"
```

---

### Task 7: Admin login page + auth layout

**Files:**
- Create: `app/admin/login/page.tsx`
- Create: `app/admin/layout.tsx`

**Produces:** `/admin/login` for magic link request; `/admin/*` redirects to login if no valid session

- [ ] **Step 1: Write app/admin/login/page.tsx**

`useSearchParams()` en Next.js App Router requiere un `<Suspense>` boundary — sin él el build falla en producción. Se separa en dos componentes: el wrapper con Suspense y el form interno.

```typescript
// app/admin/login/page.tsx
import { Suspense } from 'react'
import LoginForm from './LoginForm'

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Suspense fallback={<div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 w-full max-w-sm" />}>
        <LoginForm />
      </Suspense>
    </div>
  )
}
```

Crear también `app/admin/login/LoginForm.tsx`:

```typescript
// app/admin/login/LoginForm.tsx
'use client'
import { useState } from 'react'
import { useSearchParams } from 'next/navigation'

export default function LoginForm() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'sent' | 'error'>('idle')
  const searchParams = useSearchParams()
  const errorParam = searchParams.get('error')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('loading')
    try {
      const res = await fetch('/api/auth/magic-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      if (!res.ok) throw new Error()
      setStatus('sent')
    } catch {
      setStatus('error')
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 w-full max-w-sm">
        <h1 className="text-xl font-bold text-gray-900 mb-1">VeConecta</h1>
        <p className="text-sm text-gray-500 mb-6">Panel de administración</p>

        {errorParam === 'expired' && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4 text-sm text-amber-800">
            El enlace ha caducado. Solicita uno nuevo.
          </div>
        )}
        {errorParam === 'invalid' && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 text-sm text-red-800">
            Enlace inválido. Solicita uno nuevo.
          </div>
        )}

        {status === 'sent' ? (
          <div className="text-center py-4">
            <p className="text-gray-700 font-medium mb-1">Revisa tu email</p>
            <p className="text-gray-500 text-sm">Te hemos enviado un enlace de acceso a <strong>{email}</strong>. Válido 15 minutos.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="tu@email.com"
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300"
              />
            </div>
            {status === 'error' && (
              <p className="text-sm text-red-600">Error al enviar. Inténtalo de nuevo.</p>
            )}
            <button
              type="submit"
              disabled={status === 'loading'}
              className="w-full bg-red-700 text-white py-2 rounded-lg text-sm font-medium disabled:opacity-50"
            >
              {status === 'loading' ? 'Enviando...' : 'Enviar enlace de acceso'}
            </button>
          </form>
        )}
    </div>
  )
}
```

- [ ] **Step 2: Write app/admin/layout.tsx**

```typescript
// app/admin/layout.tsx
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/lucia'
import type { ReactNode } from 'react'

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const { user } = await getSession()
  if (!user || !user.isActive) redirect('/admin/login')

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <span className="font-bold text-gray-900">VeConecta Admin</span>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">{user.email}</span>
          <form action="/api/auth/logout" method="POST">
            <button type="submit" className="text-sm text-red-700 hover:underline">
              Salir
            </button>
          </form>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-4 py-8">{children}</main>
    </div>
  )
}
```

- [ ] **Step 3: Test auth flow**

1. Go to http://localhost:3000/admin → should redirect to /admin/login
2. Enter `admin@veconecta.org` → email sent (check Resend dashboard or real inbox)
3. Click link → redirected to /admin
4. Should see admin header with email

- [ ] **Step 4: Commit**

```bash
git add app/admin/
git commit -m "feat: admin login page + auth gate layout"
```

---

### Task 8: Admin dashboard + resource CRUD

**Files:**
- Create: `app/admin/page.tsx`
- Create: `app/admin/[country]/page.tsx`
- Create: `app/api/resources/route.ts`
- Create: `app/api/resources/[id]/route.ts`
- Create: `app/api/resources/[id]/publish/route.ts`

**Produces:** Admin can see drafts, publish resources, manage all countries; EDITOR sees only their country

- [ ] **Step 1: Write app/api/resources/route.ts (POST — create)**

```typescript
// app/api/resources/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/lucia'
import { ResourceCategory } from '@prisma/client'

const schema = z.object({
  countrySlug: z.string(),
  category: z.nativeEnum(ResourceCategory),
  name: z.string().min(1),
  url: z.string().url().optional().or(z.literal('')),
  phone: z.string().optional(),
  bizum: z.string().optional(),
  free: z.boolean().optional(),
  notesEs: z.string().optional(),
  notesEn: z.string().optional(),
  notesPt: z.string().optional(),
})

export async function POST(req: NextRequest) {
  const { user } = await getSession()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid data' }, { status: 400 })

  // EDITOR can only create resources for their country
  if (user.role === 'EDITOR' && user.countrySlug !== parsed.data.countrySlug) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const resource = await prisma.resource.create({
    data: { ...parsed.data, status: 'DRAFT', url: parsed.data.url || null },
  })

  return NextResponse.json(resource, { status: 201 })
}
```

- [ ] **Step 2: Write app/api/resources/[id]/route.ts (PATCH + DELETE)**

```typescript
// app/api/resources/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/lucia'

const patchSchema = z.object({
  name: z.string().min(1).optional(),
  url: z.string().url().optional().or(z.literal('')),
  phone: z.string().optional(),
  bizum: z.string().optional(),
  free: z.boolean().optional(),
  notesEs: z.string().optional(),
  notesEn: z.string().optional(),
  notesPt: z.string().optional(),
})

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { user } = await getSession()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const resource = await prisma.resource.findUnique({ where: { id: params.id } })
  if (!resource) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (user.role === 'EDITOR' && user.countrySlug !== resource.countrySlug) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json().catch(() => null)
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid data' }, { status: 400 })

  const updated = await prisma.resource.update({
    where: { id: params.id },
    data: { ...parsed.data, status: 'DRAFT', url: parsed.data.url || null },
  })

  return NextResponse.json(updated)
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const { user } = await getSession()
  if (!user || user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  await prisma.resource.update({
    where: { id: params.id },
    data: { status: 'ARCHIVED' },
  })

  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 3: Write app/api/resources/[id]/publish/route.ts**

```typescript
// app/api/resources/[id]/publish/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/lucia'
import { revalidatePath } from 'next/cache'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { user } = await getSession()
  if (!user || user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const resource = await prisma.resource.findUnique({ where: { id: params.id } })
  if (!resource) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const now = new Date()
  const expiresAt = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000)

  await prisma.resource.update({
    where: { id: params.id },
    data: {
      status: 'PUBLISHED',
      verifiedAt: now,
      verifiedBy: user.email,
      expiresAt,
    },
  })

  // Revalidate public pages for this country in all locales
  revalidatePath(`/es/${resource.countrySlug}`)
  revalidatePath(`/en/${resource.countrySlug}`)
  revalidatePath(`/pt/${resource.countrySlug}`)

  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 4: Write app/admin/page.tsx**

```typescript
// app/admin/page.tsx
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/lucia'

export default async function AdminDashboard() {
  const { user } = await getSession()

  const countries = await prisma.country.findMany({
    where: user!.role === 'EDITOR' && user!.countrySlug
      ? { slug: user!.countrySlug }
      : {},
    include: {
      _count: {
        select: {
          resources: { where: { status: 'DRAFT' } },
        },
      },
    },
    orderBy: { slug: 'asc' },
  })

  const reports = await prisma.communityReport.findMany({
    where: {
      resolved: false,
      ...(user!.role === 'EDITOR' && user!.countrySlug
        ? { countrySlug: user!.countrySlug }
        : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: 20,
  })

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-bold text-gray-900 mb-4">Países</h1>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {countries.map((country) => (
            <Link
              key={country.slug}
              href={`/admin/${country.slug}`}
              className="border border-gray-200 rounded-lg p-4 hover:border-red-300 hover:bg-red-50 transition-colors"
            >
              <div className="text-2xl mb-1">{country.flag}</div>
              <div className="text-sm font-medium text-gray-900">{country.nameEs}</div>
              {country._count.resources > 0 && (
                <div className="text-xs text-amber-700 mt-1">
                  {country._count.resources} borrador{country._count.resources !== 1 ? 'es' : ''}
                </div>
              )}
            </Link>
          ))}
        </div>
      </div>

      {reports.length > 0 && (
        <div>
          <h2 className="text-lg font-bold text-gray-900 mb-3">Reportes de la comunidad</h2>
          <div className="space-y-2">
            {reports.map((report) => (
              <div key={report.id} className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-xs text-gray-500 uppercase">{report.countrySlug}</span>
                    <p className="text-sm text-gray-900 mt-0.5">{report.message}</p>
                    {report.url && (
                      <a href={report.url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 underline mt-0.5 block">
                        {report.url}
                      </a>
                    )}
                    <p className="text-xs text-gray-400 mt-1">
                      {new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(report.createdAt)}
                    </p>
                  </div>
                  <ResolveButton reportId={report.id} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function ResolveButton({ reportId }: { reportId: string }) {
  async function resolve() {
    'use server'
    // prisma disponible por closure desde el import de módulo
    await prisma.communityReport.update({ where: { id: reportId }, data: { resolved: true } })
  }

  return (
    <form action={resolve}>
      <button type="submit" className="text-xs text-gray-500 hover:text-gray-700 underline shrink-0">
        Resolver
      </button>
    </form>
  )
}
```

- [ ] **Step 5: Write app/admin/[country]/page.tsx**

```typescript
// app/admin/[country]/page.tsx
import { notFound, redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/lucia'
import { ResourceCategory, ResourceStatus } from '@prisma/client'
import { revalidatePath } from 'next/cache'

export default async function AdminCountryPage({ params }: { params: { country: string } }) {
  const { user } = await getSession()
  if (!user) redirect('/admin/login')

  // EDITOR can only access their assigned country
  if (user.role === 'EDITOR' && user.countrySlug !== params.country) {
    redirect('/admin')
  }

  const country = await prisma.country.findUnique({
    where: { slug: params.country },
    include: {
      resources: {
        where: { status: { not: ResourceStatus.ARCHIVED } },
        orderBy: [{ status: 'asc' }, { category: 'asc' }, { createdAt: 'asc' }],
      },
    },
  })

  if (!country) notFound()

  const drafts = country.resources.filter(r => r.status === 'DRAFT')
  const published = country.resources.filter(r => r.status === 'PUBLISHED')

  // Server actions pueden cerrar sobre imports de módulo — NO usar dynamic imports aquí
  async function publishResource(formData: FormData) {
    'use server'
    const id = formData.get('id') as string
    const { user } = await getSession()
    if (!user || user.role !== 'ADMIN') return
    const now = new Date()
    await prisma.resource.update({
      where: { id },
      data: {
        status: 'PUBLISHED',
        verifiedAt: now,
        verifiedBy: user.email,
        expiresAt: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000),
      },
    })
    revalidatePath(`/es/${params.country}`)
    revalidatePath(`/en/${params.country}`)
  }

  async function archiveResource(formData: FormData) {
    'use server'
    const id = formData.get('id') as string
    const { user } = await getSession()
    if (!user || user.role !== 'ADMIN') return
    await prisma.resource.update({ where: { id }, data: { status: 'ARCHIVED' } })
    revalidatePath(`/es/${params.country}`)
    revalidatePath(`/en/${params.country}`)
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <span className="text-3xl">{country.flag}</span>
        <h1 className="text-xl font-bold text-gray-900">{country.nameEs}</h1>
      </div>

      {drafts.length > 0 && (
        <section>
          <h2 className="text-base font-semibold text-amber-700 mb-3">
            Borradores ({drafts.length})
          </h2>
          <div className="space-y-2">
            {drafts.map((r) => (
              <div key={r.id} className="bg-white border border-amber-200 rounded-lg p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-xs text-gray-500 uppercase">{r.category}</span>
                    <p className="font-medium text-sm text-gray-900">{r.name}</p>
                    {r.notesEs && <p className="text-xs text-gray-600 mt-0.5">{r.notesEs}</p>}
                    {r.url && <p className="text-xs text-blue-600">{r.url}</p>}
                  </div>
                  {user.role === 'ADMIN' && (
                    <div className="flex gap-2 shrink-0">
                      <form action={publishResource}>
                        <input type="hidden" name="id" value={r.id} />
                        <button type="submit" className="text-xs bg-green-700 text-white px-3 py-1 rounded">
                          Publicar
                        </button>
                      </form>
                      <form action={archiveResource}>
                        <input type="hidden" name="id" value={r.id} />
                        <button type="submit" className="text-xs border border-gray-300 text-gray-600 px-3 py-1 rounded">
                          Archivar
                        </button>
                      </form>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="text-base font-semibold text-green-700 mb-3">
          Publicados ({published.length})
        </h2>
        <div className="space-y-2">
          {published.map((r) => (
            <div key={r.id} className="bg-white border border-green-200 rounded-lg p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-xs text-gray-500 uppercase">{r.category}</span>
                  <p className="font-medium text-sm text-gray-900">{r.name}</p>
                  {r.verifiedAt && (
                    <p className="text-xs text-gray-500 mt-0.5">
                      Verificado: {new Intl.DateTimeFormat('es-ES').format(r.verifiedAt)} por {r.verifiedBy}
                    </p>
                  )}
                </div>
                {user.role === 'ADMIN' && (
                  <form action={archiveResource}>
                    <input type="hidden" name="id" value={r.id} />
                    <button type="submit" className="text-xs text-gray-400 hover:text-gray-600 underline shrink-0">
                      Archivar
                    </button>
                  </form>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
```

- [ ] **Step 6: Test admin flow end to end**

1. Go to /admin/login, enter admin@veconecta.org, receive email, click link
2. Go to /admin → see Spain with 0 drafts (all seeded as PUBLISHED)
3. Go to /admin/spain → see all published Spain resources
4. Archive one resource → verify it disappears from /es/spain

- [ ] **Step 7: Commit**

```bash
git add app/admin/ app/api/resources/
git commit -m "feat: admin dashboard + resource CRUD + publish with ISR revalidation"
```

---

### Task 9: Vercel deploy

**Files:**
- Modify: `next.config.js` (no changes needed)

- [ ] **Step 1: Create GitHub repository**

Go to github.com → New repository → `veconecta` → Public → Create.

```bash
git remote add origin https://github.com/[tu-usuario]/veconecta.git
git branch -M main
git push -u origin main
```

- [ ] **Step 2: Deploy to Vercel**

1. Go to vercel.com → New Project → Import from GitHub → select `veconecta`
2. Framework preset: Next.js (auto-detected)
3. Add environment variables:
   - `DATABASE_URL` — PostgreSQL connection string (Supabase, Neon, or Railway)
   - `RESEND_API_KEY` — from resend.com
   - `RESEND_FROM` — `VeConecta <noreply@veconecta.org>`
   - `NEXT_PUBLIC_URL` — `https://veconecta.org`
4. Deploy

- [ ] **Step 3: Run migration on production DB**

```bash
# Set DATABASE_URL to production value locally for this command
DATABASE_URL="postgresql://..." pnpm dlx prisma migrate deploy
DATABASE_URL="postgresql://..." pnpm db:seed
```

- [ ] **Step 4: Add custom domain**

In Vercel project settings → Domains → Add `veconecta.org` → follow DNS instructions.

- [ ] **Step 5: Verify production**

- https://veconecta.org → country selector
- https://veconecta.org/es/spain → Spain resources
- https://veconecta.org/en/spain → English version
- https://veconecta.org/admin → redirects to /admin/login

- [ ] **Step 6: Final commit**

```bash
git add .
git commit -m "chore: verify deploy configuration"
git push
```

---

## Self-Review

**Spec coverage check:**

| Requirement | Task |
|---|---|
| Next.js 14 App Router | Task 1 |
| next-intl ES/EN | Task 4 |
| Lucia v3 + Prisma auth | Task 2, 3 |
| Magic link via Resend | Task 3 |
| Admin panel /admin | Task 7, 8 |
| ADMIN / EDITOR roles | Task 2, 8 |
| Resource CRUD (DRAFT/PUBLISHED) | Task 8 |
| ISR revalidation on publish | Task 8 |
| VerificationBadge green/amber/red | Task 5 |
| Community report form | Task 6 |
| Country page with all categories | Task 5 |
| SEO + Open Graph | Task 5 |
| Spain seed data (13 resources) | Task 2 |
| Vercel deploy + veconecta.org | Task 9 |
| Mobile-first Tailwind | All components |

**Placeholder scan:** No TBD or TODO in code blocks. All functions shown complete.

**Type consistency:** `ResourceCategory` and `ResourceStatus` enums used consistently from `@prisma/client` throughout. `getSession()` returns `{ user, session }` and used as `{ user }` in all consumers. `revalidatePath` called for `/es/${slug}` and `/en/${slug}` in both the API route and server action.

---

## Deuda técnica — Sesión 2 (post-scaffold base)

Estas tareas quedan fuera del scaffold base intencionalmente. Ejecutar en la siguiente sesión una vez que el sitio esté desplegado y funcional.

### DT-1: OG Image para WhatsApp (prioritaria)

`generateMetadata` referencia `/og-image.png` que no existe. WhatsApp es el canal principal de difusión — sin OG image el preview es texto plano.

**Tarea:** Crear `public/og-image.png` (1200×630px).  
Opción mínima: SVG estático con fondo rojo `#dc2626`, texto "VeConecta" en blanco, bandera 🇻🇪, tagline "Desde [tu país]: qué hacer ahora mismo."  
Convertir a PNG con sharp o similar.

### DT-2: EDITOR sin país asignado

Si se crea un EDITOR sin `countrySlug`, el dashboard muestra un grid vacío sin mensaje de error.

**Tarea:** En `app/admin/page.tsx`, añadir antes del render:
```typescript
if (user.role === 'EDITOR' && !user.countrySlug) {
  return (
    <div className="text-center py-16 text-gray-500">
      <p className="text-sm">Tu cuenta no tiene un país asignado todavía.</p>
      <p className="text-xs mt-1">Contacta al administrador: admin@veconecta.org</p>
    </div>
  )
}
```

### DT-3: File Map — LoginForm.tsx no listado

`app/admin/login/LoginForm.tsx` existe en el código (Task 7 Step 1) pero no aparece en el File Map del inicio del plan. Puramente cosmético — no afecta ejecución.
