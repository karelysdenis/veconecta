# VeConecta — Documento de proyecto
**veconecta.org** | Instagram: @veconecta
*27 junio 2026*

---

## Qué es esto

VeConecta es una guía de acción para la diáspora venezolana, construida tras el terremoto del 24 de junio de 2026 (magnitudes 7.2 y 7.5, estado Yaracuy, +900 muertos, +50.000 personas sin localizar).

Responde una sola pregunta:

> *"Soy venezolana viviendo en [país]. ¿Qué puedo hacer ahora mismo?"*

No es un buscador de desaparecidos. No es un mapa de daños. No compite con los sitios existentes — es una capa de orientación encima de ellos, específica para quien está fuera de Venezuela, diseñada para durar más allá de la emergencia.

---

## Stack

```
Framework:     Next.js 14+ (App Router)
Estilos:       Tailwind CSS
i18n:          next-intl (ES/EN día 1, PT fase 2)
Auth:          Lucia v3 + Prisma  ← patrones de Projects/nido
DB:            PostgreSQL via Prisma
Email:         Resend (magic link + suscripción)
Deploy:        Vercel
Dominio:       veconecta.org
Repo:          GitHub público
```

Referencia de auth: `Projects/nido/apps/api/src/lib/lucia.ts` + `middleware/auth.ts` — adaptar a Next.js Route Handlers.

---

## Estructura de carpetas

```
veconecta/
├── messages/
│   ├── es.json
│   ├── en.json
│   └── pt.json               # Fase 2
├── app/
│   ├── [locale]/
│   │   ├── layout.tsx
│   │   ├── page.tsx          # Homepage: selector de país
│   │   └── [country]/
│   │       └── page.tsx      # Guía por país
│   ├── admin/                # Rutas protegidas
│   │   ├── layout.tsx        # Middleware auth
│   │   ├── page.tsx          # Dashboard admin
│   │   └── [country]/
│   │       └── page.tsx      # Edición por país
│   └── api/
│       ├── auth/             # Login, magic link, session
│       └── resources/        # CRUD recursos
├── components/
│   ├── CountrySelector.tsx
│   ├── ActionCard.tsx
│   ├── DigitalBridgeTutorial.tsx
│   ├── ResourceLink.tsx
│   └── VerificationBadge.tsx
├── lib/
│   ├── lucia.ts              # Auth (de Nido)
│   ├── prisma.ts             # DB client
│   └── resend.ts             # Email
├── prisma/
│   └── schema.prisma
├── i18n.ts
└── middleware.ts
```

---

## Base de datos (Prisma)

```prisma
model User {
  id            String    @id @default(cuid())
  email         String    @unique
  role          Role      @default(EDITOR)
  countrySlug   String?   // EDITOR solo accede a su país
  isActive      Boolean   @default(true)
  createdAt     DateTime  @default(now())
  sessions      Session[]
}

model Session {
  id        String   @id
  userId    String
  expiresAt DateTime
  user      User     @relation(fields: [userId], references: [id])
}

enum Role {
  ADMIN   // todos los países, aprueba y publica
  EDITOR  // solo su país, puede editar pero no publicar
}

model Country {
  slug          String     @id   // "spain", "colombia", etc.
  nameEs        String
  nameEn        String
  namePt        String?
  flag          String
  active        Boolean    @default(true)
  lastUpdatedAt DateTime   @updatedAt
  resources     Resource[]
}

model Resource {
  id            String          @id @default(cuid())
  countrySlug   String
  country       Country         @relation(fields: [countrySlug], references: [slug])
  category      ResourceCategory
  name          String
  url           String?
  phone         String?
  bizum         String?
  free          Boolean         @default(false)
  notesEs       String?
  notesEn       String?
  notesPt       String?
  status        ResourceStatus  @default(DRAFT)
  verifiedAt    DateTime?
  verifiedBy    String?
  expiresAt     DateTime?       // verifiedAt + 5 días
  createdAt     DateTime        @default(now())
  updatedAt     DateTime        @updatedAt
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
  DRAFT       // pendiente de aprobación
  PUBLISHED   // visible en el sitio
  ARCHIVED    // retirado
}

model CommunityReport {
  id          String   @id @default(cuid())
  resourceId  String?
  countrySlug String
  message     String
  url         String?  // URL del recurso reportado
  resolved    Boolean  @default(false)
  createdAt   DateTime @default(now())
}
```

---

## Auth (Lucia v3 — de Nido)

```typescript
// lib/lucia.ts
import { Lucia } from 'lucia'
import { PrismaAdapter } from '@lucia-auth/adapter-prisma'
import { prisma } from './prisma'

const adapter = new PrismaAdapter(prisma.session, prisma.user)

export const lucia = new Lucia(adapter, {
  sessionCookie: {
    attributes: { secure: process.env.NODE_ENV === 'production' }
  },
  getUserAttributes: (attributes) => ({
    email: attributes.email,
    role: attributes.role,
    countrySlug: attributes.countrySlug,
    isActive: attributes.isActive,
  }),
})
```

Login: magic link por email (Resend). Sin contraseñas.

---

## Admin panel

Rutas protegidas bajo `/admin`. Acceso por rol:

| Rol | Acceso |
|---|---|
| ADMIN | Todos los países, aprueba y publica recursos, gestiona reportes |
| EDITOR | Solo su `countrySlug`, edita recursos (quedan en DRAFT) |

Flujo de publicación:
```
EDITOR edita recurso → status: DRAFT
→ ADMIN revisa en /admin → aprueba → status: PUBLISHED
→ Next.js ISR revalida la página del país automáticamente
```

---

## Caducidad de recursos

| Estado | Condición | Badge |
|---|---|---|
| Verde | Verificado en los últimos 5 días | Verificado — fecha |
| Ámbar | 5–14 días sin verificar | Sin verificar reciente |
| Rojo | +14 días sin verificar | Verificación vencida |

Los recursos caducados nunca se ocultan — se muestran con advertencia. Ocultar información parcialmente verificada es más peligroso que mostrarla con disclaimer.

---

## i18n

```typescript
// i18n.ts
import { notFound } from 'next/navigation'
import { getRequestConfig } from 'next-intl/server'

export const locales = ['es', 'en'] as const
export type Locale = typeof locales[number]
export const defaultLocale: Locale = 'es'

export default getRequestConfig(async ({ locale }) => {
  if (!locales.includes(locale as Locale)) notFound()
  return {
    messages: (await import(`./messages/${locale}.json`)).default
  }
})
```

Dos capas:
- `messages/[locale].json` — textos UI, labels, tutorial: se traducen completamente
- DB (`notesEs`, `notesEn`, `notesPt`) — notas contextuales por recurso: se mantienen por idioma en la DB

---

## Flujo de usuario (público)

```
veconecta.org → detecta idioma → /es o /en
│
└── /es — Selector de país
    └── /es/espana
        ├── Desde España: esto es lo que puedes hacer
        ├── Última verificación + badge
        ├── Buscar familiares
        ├── Llamar gratis (Movistar / MasOrange)
        ├── Donar dinero verificado
        ├── Enviar dinero a familia (remesas desde euros)
        ├── Donar físicamente (por ciudad)
        ├── Ser puente digital (tutorial)
        ├── Trámites consulares venezolanos en España
        ├── Apoyo psicológico
        └── ¿Info desactualizada? → formulario de reporte
```

---

## Flujo de contribución

```
Público general:
  Formulario de reporte en cada página
  → CommunityReport en DB
  → Cola de revisión en /admin para ADMIN

EDITOR:
  Login magic link → /admin/[su-país]
  → Edita recursos → status DRAFT
  → ADMIN aprueba → PUBLISHED → ISR revalida

ADMIN:
  Ve todos los países
  Gestiona cola de DRAFTS y CommunityReports
  Añade y revoca editores
```

---

## SEO

```tsx
// app/[locale]/[country]/page.tsx
export async function generateMetadata({ params }) {
  // ES
  title: "Desde España: Cómo ayudar con el terremoto de Venezuela | VeConecta"
  description: "Llamadas gratis, envío de dinero desde euros, puntos de acopio y búsqueda de familiares. Recursos verificados para venezolanos en España."
  // EN
  title: "From Spain: How to help with the Venezuela earthquake | VeConecta"
  description: "Free calls, sending money from euros, drop-off points and finding family. Verified resources for Venezuelans in Spain."
}
```

Canal principal de difusión: WhatsApp — Open Graph configurado para preview limpio.

---

## Requisitos de diseño

- Mobile-first absoluto — 80% del tráfico llega desde teléfono vía WhatsApp
- Carga menos de 2 segundos en 3G
- Sin registro para usuarios públicos
- Badge de verificación visible en cada recurso
- Open Graph optimizado para preview de WhatsApp

---

## Países del MVP

| País | Prioridad | Diáspora | Estado |
|---|---|---|---|
| España | Día 1 | ~500K | Investigado |
| EEUU | Día 1 | ~1.2M | Documentado en EN |
| Colombia | Día 1 | ~2.9M | Parcial |
| Brasil | Día 1 | Creciente | Colaborador PT confirmado |
| Argentina | Día 3 | ~230K | Cruz Roja AR |
| Perú | Día 3 | ~1.5M | Pendiente |
| Chile | Día 3 | ~500K | Cruz Roja Chile |
| México | Día 3 | ~50K | Los Topos |
| Ecuador | Día 3 | ~500K | Cruz Roja EC |

---

## Tres fases de vida del sitio

**Fase 1 — Emergencia (semanas 1–2):** rescate, desaparecidos, donaciones urgentes, acopios. Contenido cambia diario.

**Fase 2 — Recuperación (semanas 3–8):** fondos de reconstrucción, apoyo psicológico de largo plazo, evaluación de viviendas.

**Fase 3 — Comunidad permanente (mes 3+):** nueva oleada migratoria, recursos de acogida por país, VeConecta como hub permanente de la diáspora venezolana global.

---

## Lo que este sitio NO es

- No es un buscador de desaparecidos
- No es un mapa de daños
- No es un sitio de noticias
- No compite con sosvenezuela2026.com, venezuelatebusca.com ni recursos existentes
- No pretende ser exhaustivo — pretende ser la respuesta más rápida a "¿qué hago desde donde estoy?"

---

## Checklist de arranque

- [x] Nombre: VeConecta
- [x] Dominio: veconecta.org
- [x] Instagram: @veconecta
- [x] Investigación de gaps y recursos completada
- [x] Decisiones de arquitectura documentadas
- [ ] Crear repositorio GitHub público
- [ ] Reclutar editor para Colombia y EEUU
- [ ] Scaffold Next.js + Tailwind + next-intl + Prisma + Lucia
- [ ] Schema Prisma + primera migración
- [ ] Auth: magic link con Resend
- [ ] Admin panel básico (CRUD recursos por país)
- [ ] Homepage con selector de país (ES + EN)
- [ ] Páginas de país: España, EEUU, Colombia, Brasil
- [ ] Tutorial puente digital (ES + EN)
- [ ] VerificationBadge con lógica de caducidad
- [ ] Formulario de reporte → CommunityReport en DB
- [ ] Deploy Vercel + veconecta.org
- [ ] Open Graph para WhatsApp
- [ ] Suscripción email (Resend) — path a comunidad Fase 3
