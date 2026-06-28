# Navegación Global + Cambio de Idioma — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Añadir header fijo con logo + bottom nav móvil (Inicio / Idioma / Compartir) a todas las páginas públicas de VeConecta.

**Architecture:** 4 Client Components nuevos (`ShareButton`, `LangPopover`, `AppHeader`, `BottomNav`) registrados en `app/[locale]/layout.tsx`. El banner de emergencia se mueve de posición sticky a franja inline en `page.tsx`. El banner del country (`VeConecta 🇪🇸 España`) se elimina porque el header global lo reemplaza. Cero dependencias npm nuevas.

**Tech Stack:** Next.js 16.2.9 App Router · next-intl 4.13.0 · Tailwind v4 · React 19 · TypeScript

## Global Constraints

- Sin nuevas dependencias npm
- `'use client'` solo donde hay hooks o eventos del browser
- Colores placeholder (`bg-red-700`, `text-amber-800`, etc.) — los definitivos los sustituirá Figma
- `<BottomNav>` oculto en desktop con `md:hidden`
- Los controles de desktop (idioma + compartir) van en `<AppHeader>`, visible solo con `md:flex`
- No tocar ningún archivo de `app/admin/`
- `locales` se importa de `@/i18n` (actualmente `['es', 'en']`)

---

### Task 1: ShareButton

**Files:**
- Create: `components/ShareButton.tsx`

**Interfaces:**
- Produces: `<ShareButton className?: string />` — dispara Web Share API, fallback a clipboard con toast "¡Copiado!" 2 seg

- [ ] **Step 1: Crear el componente**

```tsx
// components/ShareButton.tsx
'use client'

import { useState } from 'react'

export function ShareButton({ className }: { className?: string }) {
  const [copied, setCopied] = useState(false)

  async function handleShare() {
    const url = window.location.href
    const title = document.title

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title, url })
      } catch {
        // Usuario canceló — sin acción
      }
      return
    }

    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      onClick={handleShare}
      className={className}
      aria-label="Compartir"
    >
      {copied ? (
        <span className="text-xs font-medium">¡Copiado!</span>
      ) : (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="w-5 h-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
          />
        </svg>
      )}
    </button>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/ShareButton.tsx
git commit -m "feat: ShareButton con Web Share API y fallback clipboard"
```

---

### Task 2: LangPopover

**Files:**
- Create: `components/LangPopover.tsx`

**Interfaces:**
- Consumes: `locales` de `@/i18n`
- Produces: `<LangPopover direction?: 'up' | 'down' className?: string />` — globo que abre dropdown con idiomas. `direction='up'` (default) para bottom nav, `direction='down'` para header desktop.

- [ ] **Step 1: Crear el componente**

```tsx
// components/LangPopover.tsx
'use client'

import { useState, useRef, useEffect } from 'react'
import { useLocale } from 'next-intl'
import { usePathname, useRouter } from 'next/navigation'
import { locales } from '@/i18n'

const LOCALE_LABELS: Record<string, string> = {
  es: 'Español',
  en: 'English',
  pt: 'Português',
}

export function LangPopover({
  direction = 'up',
  className,
}: {
  direction?: 'up' | 'down'
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const locale = useLocale()
  const pathname = usePathname()
  const router = useRouter()
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function switchLocale(newLocale: string) {
    setOpen(false)
    // Reemplaza el segmento de locale en la URL: /es/spain → /en/spain
    const newPath = pathname.replace(`/${locale}`, `/${newLocale}`)
    router.push(newPath)
  }

  const popoverPosition =
    direction === 'up'
      ? 'bottom-full mb-2 right-0'
      : 'top-full mt-2 right-0'

  return (
    <div ref={ref} className={`relative ${className ?? ''}`}>
      <button
        onClick={() => setOpen(!open)}
        aria-label="Cambiar idioma"
        aria-expanded={open}
        className="flex items-center justify-center"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="w-5 h-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
          />
        </svg>
      </button>

      {open && (
        <div
          className={`absolute ${popoverPosition} bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden min-w-[140px] z-50`}
        >
          {locales.map((l) => (
            <button
              key={l}
              onClick={() => switchLocale(l)}
              className="w-full flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-gray-50 text-left"
            >
              {l === locale ? (
                <svg
                  className="w-4 h-4 text-red-700 shrink-0"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              ) : (
                <span className="w-4 shrink-0" />
              )}
              <span
                className={
                  l === locale
                    ? 'font-medium text-gray-900'
                    : 'text-gray-600'
                }
              >
                {LOCALE_LABELS[l] ?? l.toUpperCase()}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/LangPopover.tsx
git commit -m "feat: LangPopover dropdown con cambio de locale via URL"
```

---

### Task 3: AppHeader

**Files:**
- Create: `components/AppHeader.tsx`

**Interfaces:**
- Consumes: `<LangPopover direction="down">`, `<ShareButton>`
- Produces: `<AppHeader locale={string} />` — header fijo 44px, logo a la izquierda, controles a la derecha solo en desktop

- [ ] **Step 1: Crear el componente**

```tsx
// components/AppHeader.tsx
import Link from 'next/link'
import { LangPopover } from './LangPopover'
import { ShareButton } from './ShareButton'

export function AppHeader({ locale }: { locale: string }) {
  return (
    <header className="fixed top-0 left-0 right-0 z-40 h-11 bg-red-700 flex items-center px-4">
      <Link
        href={`/${locale}`}
        className="text-white font-bold text-base flex items-center gap-1.5 flex-1"
      >
        🇻🇪 VeConecta
      </Link>

      {/* Controles solo en desktop */}
      <div className="hidden md:flex items-center gap-4 text-white">
        <LangPopover direction="down" />
        <ShareButton />
      </div>
    </header>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/AppHeader.tsx
git commit -m "feat: AppHeader fijo con logo y controles desktop"
```

---

### Task 4: BottomNav

**Files:**
- Create: `components/BottomNav.tsx`

**Interfaces:**
- Consumes: `<LangPopover direction="up">`, `<ShareButton>`
- Produces: `<BottomNav locale={string} />` — barra fija abajo, visible solo en móvil (`md:hidden`), safe-area-inset para iOS

- [ ] **Step 1: Crear el componente**

```tsx
// components/BottomNav.tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LangPopover } from './LangPopover'
import { ShareButton } from './ShareButton'

export function BottomNav({ locale }: { locale: string }) {
  const pathname = usePathname()
  const isHome = pathname === `/${locale}`

  const activeClass = 'text-red-700'
  const inactiveClass = 'text-gray-500'

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 flex"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {/* Inicio */}
      <Link
        href={`/${locale}`}
        className={`flex flex-1 flex-col items-center justify-center gap-1 py-2 text-xs ${
          isHome ? activeClass : inactiveClass
        }`}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="w-5 h-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
          />
        </svg>
        <span>Inicio</span>
      </Link>

      {/* Idioma */}
      <div
        className={`flex flex-1 flex-col items-center justify-center gap-1 py-2 text-xs ${inactiveClass}`}
      >
        <LangPopover direction="up" />
        <span>Idioma</span>
      </div>

      {/* Compartir */}
      <div
        className={`flex flex-1 flex-col items-center justify-center gap-1 py-2 text-xs ${inactiveClass}`}
      >
        <ShareButton />
        <span>Compartir</span>
      </div>
    </nav>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/BottomNav.tsx
git commit -m "feat: BottomNav movil con Inicio/Idioma/Compartir"
```

---

### Task 5: Wire up en layout y páginas

**Files:**
- Modify: `app/[locale]/layout.tsx`
- Modify: `app/[locale]/page.tsx`
- Modify: `app/[locale]/[country]/page.tsx`

**Interfaces:**
- Consumes: `<AppHeader locale>`, `<BottomNav locale>`

- [ ] **Step 1: Actualizar layout.tsx**

Reemplaza el contenido completo de `app/[locale]/layout.tsx`:

```tsx
import { NextIntlClientProvider } from 'next-intl'
import { getMessages, setRequestLocale } from 'next-intl/server'
import { locales } from '@/i18n'
import { AppHeader } from '@/components/AppHeader'
import { BottomNav } from '@/components/BottomNav'
import type { ReactNode } from 'react'
import '../globals.css'

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }))
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  const messages = await getMessages()

  return (
    <html lang={locale}>
      <body className="bg-white text-gray-900 antialiased">
        <NextIntlClientProvider messages={messages}>
          <AppHeader locale={locale} />
          {/* pt-11: compensa header fijo 44px; pb-20 md:pb-0: compensa bottom nav móvil */}
          <div className="pt-11 pb-20 md:pb-0">
            {children}
          </div>
          <BottomNav locale={locale} />
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
```

- [ ] **Step 2: Actualizar homepage — banner inline**

En `app/[locale]/page.tsx`, reemplaza el `<main>` completo:

```tsx
return (
  <main className="min-h-screen bg-white">
    <div className="bg-amber-50 border-b border-amber-200 text-amber-800 py-2 px-4 text-center text-sm font-medium">
      {t('emergencyBanner')}
    </div>
    <div className="max-w-2xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">{t('title')}</h1>
      <p className="text-gray-600 mb-8">{t('subtitle')}</p>
      <CountrySelector countries={countries} locale={locale} />
    </div>
  </main>
)
```

- [ ] **Step 3: Actualizar country page — eliminar banner fijo**

En `app/[locale]/[country]/page.tsx`, reemplaza el `<main>` completo. El div rojo de `VeConecta {flag} {name}` desaparece; el flag pasa al `<h1>`:

```tsx
return (
  <main className="min-h-screen bg-white">
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-xl font-bold text-gray-900">
          {country.flag} {locale === 'en' ? `From ${name}` : `Desde ${name}`}
        </h1>
        {lastUpdated && (
          <span className="text-xs text-gray-500">
            {t('lastUpdated', { date: lastUpdated })}
          </span>
        )}
      </div>
      <p className="text-gray-600 text-sm mb-6">
        {locale === 'en'
          ? "Here's what you can do right now:"
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

      <ReportForm countrySlug={slug} />
    </div>
  </main>
)
```

- [ ] **Step 4: Verificar en dev**

```bash
pnpm dev
```

Checklist visual:
- `http://localhost:3000/es` → header rojo fijo arriba, banner amber inline, bottom nav abajo
- `http://localhost:3000/es/spain` → header, sin banner rojo, flag en h1, bottom nav
- Bottom nav "Inicio" en rojo en `/es`, gris en `/es/spain`
- Tocar "Idioma" → popover sube, seleccionar EN → navega a `/en/spain`
- Tocar "Compartir" → Web Share API (móvil) o "¡Copiado!" (desktop)
- Resize a desktop → bottom nav desaparece, header muestra globo + compartir

- [ ] **Step 5: Commit**

```bash
git add "app/[locale]/layout.tsx" "app/[locale]/page.tsx" "app/[locale]/[country]/page.tsx"
git commit -m "feat: wire up AppHeader y BottomNav en layout publico"
```

---

### Task 6: Build y deploy

- [ ] **Step 1: Verificar TypeScript**

```bash
npx tsc --noEmit
```

Salida esperada: sin errores.

- [ ] **Step 2: Build de produccion**

```bash
pnpm build
```

Verificar en el output que `/[locale]` sigue siendo `●` (SSG con revalidate 1h) y `/[locale]/[country]` sigue siendo `ƒ` (dynamic).

- [ ] **Step 3: Deploy**

```bash
vercel --prod
```

- [ ] **Step 4: Verificar en produccion**

Abrir `https://veconecta.org/es` en Chrome móvil (o DevTools modo móvil):
- Header rojo fijo
- Bottom nav blanco fijo abajo
- Cambio de idioma funciona en URL real
- Share abre menú nativo del SO
