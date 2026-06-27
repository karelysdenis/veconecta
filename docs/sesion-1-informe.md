# VeConecta — Informe de sesión 1 (2026-06-27)

Scaffold completo del hub de recursos para la diáspora venezolana post-terremoto (Yaracuy, 7.2 + 7.5, 24 junio 2026).

---

## Qué se construyó

### Stack final

| Capa | Tecnología | Versión |
|------|-----------|---------|
| Framework | Next.js App Router | 16.2.9 |
| Estilos | Tailwind CSS | v4 |
| i18n | next-intl | 4.13.0 |
| Auth | Lucia v3 + `@lucia-auth/adapter-prisma` | 3.2.2 / 4.0.1 |
| ORM | Prisma | 5.22.0 (degradado de v7 por incompatibilidad con lucia) |
| Base de datos | PostgreSQL | local: `veconecta` |
| Email | Resend | SDK instalado |
| Deploy | Vercel (pendiente) | CLI 54.18.0 |

### Commits

```
07cbe8c  chore: rename middleware.ts to proxy.ts (Next.js 16 convention)
cc1a926  fix: add ADMIN role check to resolve server action
8e7fbc7  feat: admin dashboard + resource CRUD + publish with ISR revalidation
c0b7116  feat: admin login page + auth gate layout
4bb888d  feat: community report form + API
a16730b  feat: public homepage and country page with Spain data
05c1f45  feat: next-intl setup with ES/EN messages
b62703a  feat: lucia auth with magic link via Resend
e448ce1  fix: downgrade prisma to v5 for lucia adapter compatibility
b5c3710  feat: prisma schema, migration, seed with Spain data
5e013b6  feat: init Next.js + install dependencies
027c629  chore: project spec and implementation plan
```

### Archivos principales

```
app/
  layout.tsx                         — passthrough root (Next.js 16 requerido)
  [locale]/
    layout.tsx                       — LocaleLayout con next-intl + globals.css
    page.tsx                         — Homepage con CountrySelector
    [country]/
      page.tsx                       — Country page con recursos + badges + reporte
  admin/
    layout.tsx                       — wrapper sin auth (evita redirect loop)
    login/page.tsx                   — Suspense wrapper para LoginForm
    (dashboard)/
      layout.tsx                     — auth guard (getSession → redirect si no auth)
      page.tsx                       — Dashboard: borradores por país + reportes
      [country]/page.tsx             — Lista de recursos con publish/archive
  api/
    auth/
      magic-link/route.ts            — POST: genera token + envía email
      verify/route.ts                — GET: valida token + crea sesión
      logout/route.ts                — POST: invalida sesión
    reports/route.ts                 — POST: guarda reporte comunitario (rate limit 3/60s)
    resources/
      route.ts                       — POST: crea recurso
      [id]/route.ts                  — PATCH: edita / DELETE: archiva
      [id]/publish/route.ts          — POST: publica + revalidatePath
components/
  VerificationBadge.tsx              — badge verde/ámbar/rojo según daysSince(verifiedAt)
  ResourceLink.tsx                   — enlace de recurso (url, tel, bizum)
  DigitalBridgeTutorial.tsx          — tutorial paso a paso para enviar dinero
  ActionCard.tsx                     — tarjeta de recurso por categoría
  CountrySelector.tsx                — grid de países con conteo de recursos
  ReportForm.tsx                     — formulario de reporte comunitario (client)
  admin/LoginForm.tsx                — formulario magic link con useSearchParams
lib/
  lucia.ts                           — Lucia + PrismaAdapter + getSession (cache)
  prisma.ts                          — singleton PrismaClient v5
  resend.ts                          — Resend singleton + sendMagicLink
  types.ts                           — SerializedResource + serializeResource()
prisma/
  schema.prisma                      — User, Session, MagicToken, Country, Resource, CommunityReport
  seed.ts                            — 9 países + 13 recursos España (PUBLISHED) + 1 admin
messages/
  es.json                            — mensajes completos en español
  en.json                            — mensajes completos en inglés
i18n.ts                              — next-intl v4 config (requestLocale API)
proxy.ts                             — locale routing middleware (renombrado de middleware.ts)
```

### Datos sembrados (local)

- 9 países: España, EE.UU., Colombia, Brasil, Argentina, Perú, Chile, México, Ecuador
- 13 recursos de España: PUBLISHED, verifiedAt = 27/06/2026, verifiedBy = "VeConecta", expiresAt = +14 días
- 1 usuario admin: `admin@veconecta.org`, rol ADMIN

---

## Estado actual del deploy

El código está en GitHub: `https://github.com/karelysdenis/veconecta.git` (rama `master`).

El servidor local corre en `http://localhost:3000` con la base de datos local.

### Para completar el deploy en Vercel

**Paso 1: Re-autenticar Vercel CLI** (el upgrade invalidó el token)

```bash
vercel login
```

**Paso 2: Base de datos de producción**

Crea una base de datos PostgreSQL gratuita en [neon.tech](https://neon.tech) (0.5 GB, sin tarjeta):

1. Crea cuenta → New project → nombre: `veconecta`
2. Copia el connection string: `postgresql://user:pass@ep-xxx.us-east-1.aws.neon.tech/veconecta?sslmode=require`

**Paso 3: Variables de entorno en Vercel**

Ejecuta esto desde el directorio del proyecto (reemplaza los valores reales):

```bash
vercel env add DATABASE_URL production
# pega el connection string de Neon

vercel env add RESEND_API_KEY production
# pega tu API key real de resend.com

vercel env add RESEND_FROM production
# VeConecta <noreply@veconecta.org>

vercel env add NEXT_PUBLIC_URL production
# https://veconecta.org
```

**Paso 4: Migrar y sembrar la base de datos de producción**

```bash
DATABASE_URL="postgresql://tu-string-de-neon" ./node_modules/.bin/prisma migrate deploy
DATABASE_URL="postgresql://tu-string-de-neon" pnpm db:seed
```

**Paso 5: Deploy**

```bash
vercel --prod
```

**Paso 6: Dominio personalizado**

En Vercel dashboard → Project → Settings → Domains → Add `veconecta.org` → seguir instrucciones DNS.

---

## Resend: obtener API key real

1. Ve a [resend.com](https://resend.com) → Sign up (gratis: 100 emails/día)
2. Dashboard → API Keys → Create API Key → nombre: `veconecta`
3. Verifica el dominio `veconecta.org` en Resend (Settings → Domains) para poder usar `noreply@veconecta.org`
4. Mientras no tengas el dominio verificado, usa `onboarding@resend.dev` como `RESEND_FROM` (solo para pruebas)

Para probar el magic link en local, reemplaza `re_xxxxxxxxxx` en `.env.local` con tu key real.

---

## Deuda técnica (Sesión 2)

### DT-1: OG image para WhatsApp (PRIORITARIA)

El `generateMetadata` en la country page referencia `/og-image.png` que no existe. WhatsApp es el canal principal de difusión — sin OG image el preview es texto plano.

**Tarea:** Crear `public/og-image.png` (1200×630px).
Opción mínima: SVG con fondo rojo `#dc2626`, texto "VeConecta" blanco, bandera, tagline "Desde tu país: qué hacer ahora mismo." Convertir a PNG.

### DT-2: EDITOR sin país asignado

Si se crea un EDITOR sin `countrySlug`, el dashboard muestra un grid vacío.

**Fix en `app/admin/(dashboard)/page.tsx`:**

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

### DT-3: Lucia + adapter deprecados

`lucia@3.2.2` y `@lucia-auth/adapter-prisma@4.0.1` están deprecados upstream. Funcional para MVP, pero evaluar migración a Better Auth o Auth.js v5 antes de escalar.

### DT-4: Fecha del badge hardcodeada en es-ES

`VerificationBadge` usa `es-ES` para formatear la fecha independientemente del locale activo. Fix: pasar el locale como prop o usar `useLocale()`.

---

## Notas técnicas relevantes

- **Prisma v7 incompatible con lucia**: downgrade a v5 en Task 2. Si se actualiza Prisma, debe migrarse el adaptador de auth primero.
- **`cookies()` async en Next.js 16**: todos los usos de cookies en route handlers y server actions usan `await cookies()`.
- **`params` async en Next.js 16**: todos los pages y layouts reciben `params: Promise<{...}>` y hacen `await params`.
- **`prisma migrate dev` requiere TTY**: para nuevas migraciones en local usa `./node_modules/.bin/prisma migrate dev` en una terminal interactiva, no desde scripts.
- **`proxy.ts` en vez de `middleware.ts`**: Next.js 16 deprecó el nombre `middleware.ts`; renombrado a `proxy.ts`.

---

## Dónde está todo

| Recurso | Ubicación |
|---------|-----------|
| Repo | `https://github.com/karelysdenis/veconecta.git` |
| Plan de implementación | `docs/superpowers/plans/2026-06-27-veconecta-scaffold.md` |
| Ledger de progreso SDD | `.superpowers/sdd/progress.md` |
| Variables de entorno local | `.env.local` (gitignoreado) |
| Base de datos local | PostgreSQL `veconecta` en localhost:5432 |

---

_Informe generado al cierre de la Sesión 1 — 2026-06-27_
