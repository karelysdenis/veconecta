# VeConecta — Auditoría QA Senior (2026-06-28)

## Resumen ejecutivo

El scaffold está sólido para un MVP de emergencia: el flujo de autenticación con magic link tiene buena entropía (256 bits), protección anti-enumeración de emails, y las API routes aplican validación de input con Zod en todos los endpoints. El diseño de roles ADMIN/EDITOR está correctamente implementado en las rutas de API, y la serialización Server→Client de fechas (via `SerializedResource`) está bien pensada.

Hay seis hallazgos **críticos** que deben atenderse antes de escalar: la OG image faltante (rompe el canal principal de difusión, WhatsApp), el rate limiting en-memoria de `/api/reports` que no funciona en serverless, la ausencia de rate limiting en magic-link, una escalada de privilegios silenciosa para EDITORs sin país asignado, tokens de verificación que se crean aunque el email falle, y la URL de magic links apuntando al subdominio de Vercel en lugar del dominio futuro.

La cobertura de tests es cero. Para una plataforma de emergencia en producción, al menos los flujos de auth y publicación deberían tener tests de integración antes de incorporar colaboradores.

---

## Hallazgos por área

### CRÍTICO (bloquea usuarios o es riesgo de seguridad)

- **[SEGURIDAD] Sin rate limiting en `/api/auth/magic-link`**
  - Archivo: `app/api/auth/magic-link/route.ts:15`
  - Descripción: Cualquiera puede hacer POST repetido con cualquier email registrado, disparando emails indefinidamente y saturando el cupo de Resend (100/día en plan gratuito). El endpoint de `/api/reports` tiene rate limiting pero este no.
  - Reproducción: `for i in {1..200}; do curl -X POST https://veconecta.vercel.app/api/auth/magic-link -H "Content-Type: application/json" -d '{"email":"admin@veconecta.org"}'; done`
  - Fix: Aplicar el mismo patrón de `ipTimestamps` Map que existe en `/api/reports`, o usar `X-Forwarded-For` + ventana de 5 intentos/10 min.

- **[SEGURIDAD] EDITOR sin `countrySlug` ve todos los países y reportes**
  - Archivo: `app/admin/(dashboard)/page.tsx:10-32`
  - Descripción: Si se crea un EDITOR sin `countrySlug`, la condición `user!.role === 'EDITOR' && user!.countrySlug` evalúa como `false` (porque `countrySlug` es null/falsy), cayendo al branch `where: {}` que devuelve **todos** los países y todos los reportes sin filtro. No es solo UI vacía (como decía DT-2): es una escalada de privilegios en lectura.
  - Reproducción: Crear un user `{ email: 'x@x.com', role: 'EDITOR', countrySlug: null }` y loguearse.
  - Fix:
    ```typescript
    if (user!.role === 'EDITOR' && !user!.countrySlug) {
      return <p className="text-sm text-gray-500 py-16 text-center">
        Cuenta sin país asignado. Contacta al administrador.
      </p>
    }
    // Filtrar siempre por countrySlug si es EDITOR
    where: user!.role === 'EDITOR' ? { slug: user!.countrySlug! } : {}
    ```

- **[FUNCIONAL] Rate limiting en-memoria inefectivo en Vercel serverless**
  - Archivo: `app/api/reports/route.ts:13`
  - Descripción: `const ipTimestamps = new Map<string, number[]>()` vive en memoria del proceso. En Vercel, cada cold start crea un proceso nuevo; el Map se reinicia. Bajo carga real, el rate limiter nunca acumula estado entre invocaciones distintas, siendo completamente inefectivo.
  - Fix: Reemplazar por Upstash Redis (Vercel Marketplace) con `@upstash/ratelimit`.

- **[FUNCIONAL] OG image faltante — WhatsApp preview roto**
  - Archivo: `app/[locale]/[country]/page.tsx:43`
  - Descripción: `images: [{ url: '/og-image.png', width: 1200, height: 630 }]` referencia un archivo que no existe en `/public`. WhatsApp (canal principal de difusión) mostrará solo texto plano en todos los links compartidos.
  - Reproducción: Compartir `https://veconecta.vercel.app/es/spain` en WhatsApp → sin preview visual.
  - Fix: Crear `public/og-image.png` de 1200×630px. (DT-1 pendiente desde sesión 1.)

- **[SEGURIDAD] Token de magic link creado aunque el email falle**
  - Archivo: `app/api/auth/magic-link/route.ts:41-45`
  - Descripción: El token se persiste en DB antes de intentar enviar el email. Si `sendMagicLink` lanza excepción (capturada como "non-fatal"), el token queda válido 15 minutos en la DB pero el usuario nunca recibe el email. Si hay un leak de la DB, el token es explotable.
  - Fix: Si `sendMagicLink` falla, borrar el token recién creado en el catch.

- **[FUNCIONAL] `NEXT_PUBLIC_URL` apunta a `veconecta.vercel.app`**
  - Archivo: `lib/resend.ts:7` + variable de entorno production
  - Descripción: Los magic links enviados por email dirigirán a `veconecta.vercel.app`. Cuando se añada `veconecta.org`, los emails seguirán apuntando al subdominio.
  - Fix: Actualizar `NEXT_PUBLIC_URL` en producción a `https://veconecta.org` al configurar el dominio.

---

### IMPORTANTE (degrada experiencia o puede causar bugs)

- **[FUNCIONAL] Homepage es SSG — nuevos países no aparecen hasta redeploy**
  - Archivo: `app/[locale]/page.tsx:15`
  - Descripción: La página está marcada como `●` (prerendered SSG). `prisma.country.findMany` se ejecuta en build time. Activar un nuevo país con `active: true` no se reflejará hasta el próximo deploy.
  - Fix: Añadir `export const revalidate = 3600` para ISR.

- **[BD] Índices de base de datos faltantes**
  - Archivo: `prisma/schema.prisma`
  - Descripción: Las queries más frecuentes no tienen índices:
    - `Resource.status` — filtrado en cada carga de country page
    - `Resource.countrySlug` — JOIN frecuente
    - `MagicToken.email` — `deleteMany({ where: { email } })` sin índice
    - `CommunityReport.resolved` y `CommunityReport.countrySlug`
  - Fix: Añadir `@@index([status])`, `@@index([countrySlug])`, etc. y migrar.

- **[BD] Seed no idempotente para recursos**
  - Archivo: `prisma/seed.ts:186-188`
  - Descripción: `prisma.resource.create()` en loop sin verificación de duplicados. Ejecutar seed dos veces duplica los 13 recursos. Countries usan `skipDuplicates: true` pero resources no.
  - Fix: Usar `upsert` con campo único compuesto `(countrySlug, name)`.

- **[FUNCIONAL] Inconsistencia de `revalidatePath` entre API route y server action**
  - Archivo: `app/api/resources/[id]/publish/route.ts:33-35` vs `app/admin/(dashboard)/[country]/page.tsx:51-53`
  - Descripción: La API route revalida `/es`, `/en` y `/pt`. El server action omite `/pt`.
  - Fix: Añadir `revalidatePath('/pt/${country}')` en `publishResource` y `archiveResource`.

- **[SEGURIDAD] Sin manejo de errores de Prisma en API routes**
  - Archivo: Todos los `app/api/**/*.ts`
  - Descripción: Ningún endpoint wrappea las queries de Prisma en try/catch. Si Neon hiberna (frecuente en free tier), el error burbujea como 500 sin cuerpo.
  - Fix: Wrap genérico en cada handler que capture `PrismaClientKnownRequestError`.

- **[FUNCIONAL] Sin connection pooling configurado para Neon serverless**
  - Archivo: `lib/prisma.ts`
  - Descripción: Sin `pgbouncer=true&connection_limit=1` en la DATABASE_URL, bajo carga cada Lambda abre su propia conexión Postgres directa. Con el límite de Neon free tier (~10 conexiones), un pico puede causar `too many connections`.
  - Fix: Añadir `?pgbouncer=true&connection_limit=1` a la DATABASE_URL, o migrar a `@prisma/adapter-neon`.

- **[UX] "En preparación" hardcodeado en español en `ActionCard`**
  - Archivo: `components/ActionCard.tsx:59`
  - Descripción: `<p>En preparación.</p>` sin i18n. En locale `en` los usuarios ven texto en español cuando una categoría no tiene recursos.
  - Fix: Añadir key `categories.empty` en ambos JSON.

- **[UX] Server actions sin feedback visual de pending**
  - Archivo: `app/admin/(dashboard)/[country]/page.tsx:96-114`
  - Descripción: Los botones "Publicar" y "Archivar" no tienen `useFormStatus`. El admin no sabe si la acción se completó hasta que la página se recarga.
  - Fix: Extraer a componentes `'use client'` con `useFormStatus()` de React 19.

- **[FUNCIONAL] Race condition teórico en verificación de magic link**
  - Archivo: `app/api/auth/verify/route.ts:11-28`
  - Descripción: Entre `findUnique(token)` y `delete(token)` hay una ventana donde dos requests concurrentes con el mismo token podrían pasar la validación y crear dos sesiones.
  - Fix: Envolver en `prisma.$transaction([findUnique, delete, createSession])`.

---

### MENOR (mejoras, deuda técnica, nice-to-have)

- **[DT-4] `VerificationBadge` usa `es-ES` hardcodeado**
  - Archivo: `components/VerificationBadge.tsx:29`
  - Fix: Pasar `locale` como prop desde `ResourceLink` hasta `VerificationBadge`.

- **[DT-3] Lucia v3 + `@lucia-auth/adapter-prisma` deprecados**
  - Funcional para MVP. Evaluar migración a Better Auth o Auth.js v5 en Sesión 3.

- **[I18N] Locale `pt` en código pero ausente en configuración**
  - Archivos: `components/ActionCard.tsx:27`, `components/CountrySelector.tsx:15-17`, `app/[locale]/[country]/page.tsx:72-76`
  - Descripción: Múltiples branches manejan `locale === 'pt'` pero `i18n.ts` solo define `['es', 'en']`. Dead code. No hay `messages/pt.json`.
  - Fix: Eliminar branches pt hasta que se decida soportarlo, o crear pt.json.

- **[I18N] Keys definidos en JSON pero no consumidos**
  - `verification.reportError` — definido en ambos JSON, no usado.
  - `country.noResources` — definido en ambos JSON; `ActionCard` usa string hardcodeado en lugar de este key.

- **[ACCESIBILIDAD] `<label>` sin `htmlFor` en LoginForm**
  - Archivo: `components/admin/LoginForm.tsx:53`
  - Fix: `<label htmlFor="email">` + `<input id="email" ...>`.

- **[ACCESIBILIDAD] Botones toggle sin `aria-expanded`**
  - Archivos: `components/ActionCard.tsx:43`, `components/DigitalBridgeTutorial.tsx:13`
  - Fix: Añadir `aria-expanded={open}` a los botones de acordeón.

- **[ACCESIBILIDAD] Recursos no accesibles sin JavaScript**
  - Archivo: `components/ActionCard.tsx`
  - Descripción: Todo el contenido está en acordeones que requieren JS. En una página de emergencia esto es un riesgo de accesibilidad.
  - Fix: Usar `<details>/<summary>` nativo, o renderizar abiertos por defecto los más críticos.

- **[CONFIG] `.env` detectado por Vercel en build**
  - Descripción: El build warning "Detected .env file" indica un archivo de entorno rastreado. Verificar que `.env.local` esté en `.gitignore`.

- **[CÓDIGO] `process.env.RESEND_FROM!` non-null assertion sin validación**
  - Archivo: `lib/resend.ts:10`
  - Fix: Validación de env vars al arrancar (`@t3-oss/env-nextjs` o check manual).

---

## Matriz de riesgo

| Hallazgo | Probabilidad | Impacto | Prioridad |
|---|---|---|---|
| OG image faltante | Alta (ya ocurre) | Alto (misión crítica) | P0 |
| EDITOR sin país ve todo | Media | Alto (info sensible) | P0 |
| Sin rate limit magic-link | Media | Alto (spam/cuota) | P1 |
| Rate limit en-memoria inefectivo | Alta (serverless) | Medio | P1 |
| Token creado si email falla | Baja | Medio | P1 |
| NEXT_PUBLIC_URL incorrecto | Alta (al añadir dominio) | Alto (auth rota) | P1 |
| Homepage SSG sin revalidate | Media | Medio | P2 |
| Índices DB faltantes | Alta bajo carga | Alto bajo carga | P2 |
| Seed no idempotente | Alta si se re-seedea | Bajo | P2 |
| Sin error handling Prisma | Media (Neon free) | Medio | P2 |
| Sin connection pooling Neon | Media bajo carga | Alto bajo carga | P2 |
| "En preparación" sin i18n | Alta | Bajo | P3 |
| Actions sin feedback pending | Alta | Bajo | P3 |
| Race condition magic link | Muy baja | Bajo | P3 |
| VerificationBadge locale | Alta (users en) | Bajo | P3 |
| label sin htmlFor | Alta | Bajo (accesibilidad) | P3 |

---

## Cobertura de tests

**Tests existentes: ninguno.** El proyecto no tiene `__tests__/`, `*.test.ts`, `*.spec.ts`, ni configuración de Jest/Vitest.

Flujos críticos sin cobertura:

| Flujo | Riesgo sin test |
|---|---|
| Magic link: generar → enviar → verificar → sesión | Alto — cualquier regresión rompe el único método de login |
| Publish resource + revalidatePath | Medio — ISR puede quedar roto silenciosamente |
| EDITOR scope enforcement | Alto — riesgo de seguridad |
| Rate limiting de `/api/reports` | Alto — inefectivo en serverless |
| Seed idempotency | Medio — duplicados silenciosos |

---

## Estado general

| Área | Estado | Nota |
|---|---|---|
| Seguridad auth | AMARILLO | Token bien generado; falta rate limit magic-link y transacción en verify |
| Autorización API routes | VERDE | ADMIN/EDITOR bien aplicado |
| Autorización dashboard | ROJO | EDITOR sin país escala privilegios en lectura |
| Correctitud funcional | AMARILLO | Flujos principales OK; ISR parcialmente inefectivo |
| Base de datos | AMARILLO | Schema sólido; faltan índices y connection pooling |
| Performance | AMARILLO | Homepage SSG sin ISR; páginas dinámicas correctas |
| i18n | VERDE | Cobertura completa es/en; dead code pt menor |
| UX / Accesibilidad | AMARILLO | Forms con estados; recursos no accesibles sin JS |
| Cobertura de tests | ROJO | Cero tests |
| Deploy | VERDE | Build exitoso en Vercel; env vars limpias |

---

_Auditoría generada al cierre de la Sesión 2 — 2026-06-28_
