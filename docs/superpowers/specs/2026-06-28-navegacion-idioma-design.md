# VeConecta — Navegación global + cambio de idioma
**Fecha:** 2026-06-28
**Estado:** Aprobado, pendiente de implementación

---

## Problema

El sitio carece de navegación global. Los usuarios que llegan directamente a una página de país (el caso principal, vía WhatsApp) no tienen forma visible de:
- Volver al selector de países
- Cambiar el idioma
- Compartir la página

El idioma solo cambia editando la URL manualmente.

---

## Decisiones de diseño

- **Patrón móvil:** bottom nav flotante (no header sticky con controles)
- **Idioma:** popover/dropdown (escala a PT y futuros idiomas sin cambio estructural)
- **Compartir:** Web Share API nativa, fallback a copiar link al portapapeles
- **Colores:** definidos en Figma, no en este spec

---

## Componentes

### 1. Header fijo (`<AppHeader>`)

**Todas las páginas públicas** (`[locale]/page.tsx`, `[locale]/[country]/page.tsx`).
No aparece en `/admin/*`.

**Móvil y desktop:**
- Altura: 44px
- Logo "🇻🇪 VeConecta" a la izquierda, blanco, bold, clickeable → `/{locale}`
- En **desktop (≥768px):** añade a la derecha: icono 🌐 (abre popover idioma) + botón "Compartir"
- En **móvil:** solo el logo — los controles están en el bottom nav

**Implementación:** Server Component, recibe `locale` como prop. El logo es un `<Link href="/{locale}">`.

---

### 2. Bottom navigation (`<BottomNav>`)

**Solo en móvil (< 768px).** Visible en todas las páginas públicas.

**Estructura (3 items iguales):**
```
[ 🏠 Inicio ]   [ 🌐 Idioma ]   [ ↗ Compartir ]
```

- Posición: `fixed bottom-0`, `safe-area-inset-bottom` para notch de iOS
- El item "Inicio" activo cuando `pathname === '/{locale}'`
- "Idioma" al tocarlo abre `<LangPopover>`
- "Compartir" llama a `ShareButton`

**Implementación:** Client Component (`'use client'`) para detectar pathname activo y manejar interacciones.

---

### 3. Popover de idioma (`<LangPopover>`)

Aparece anclado sobre el botón que lo dispara (bottom nav en móvil, header en desktop).

**Contenido:**
```
✓ Español   ← idioma activo, checkmark
  English
```
Cuando se añada PT: se suma una línea, sin cambios estructurales.

**Comportamiento:**
- Seleccionar idioma navega a la misma ruta con nuevo locale:
  - `/es/spain` → `/en/spain`
  - `/es` → `/en`
- Cierra al seleccionar o al tocar fuera (click outside)
- Usa `useRouter()` + `usePathname()` de next-intl para construir la URL destino

**Implementación:** Client Component. Usa `useLocale()` y `usePathname()` de `next-intl/client`.

---

### 4. Botón compartir (`<ShareButton>`)

**Comportamiento:**
1. Intenta `navigator.share({ title: document.title, url: window.location.href })`
2. Si `navigator.share` no está disponible (desktop, Firefox): `navigator.clipboard.writeText(url)` + toast "Link copiado"
3. El toast desaparece a los 2 segundos

**Implementación:** Client Component. El toast es un `<div>` posicionado absolutamente, sin librería externa.

---

### 5. Banner de emergencia (refactorizado)

El banner actual (franja roja fija en top) pasa a ser una franja **inline** dentro del contenido de cada página, justo después del header. No es sticky.

- Mismo texto de alerta (`t('emergencyBanner')`)
- Color definido en Figma
- Presente en homepage y country page

---

## Rutas afectadas

| Archivo | Cambio |
|---|---|
| `app/[locale]/layout.tsx` | Añadir `<AppHeader locale={locale}>` |
| `app/[locale]/page.tsx` | Reemplazar banner fijo por franja inline + añadir `<BottomNav>` |
| `app/[locale]/[country]/page.tsx` | Igual que homepage |
| `components/AppHeader.tsx` | Nuevo componente |
| `components/BottomNav.tsx` | Nuevo componente |
| `components/LangPopover.tsx` | Nuevo componente |
| `components/ShareButton.tsx` | Nuevo componente |

---

## Comportamiento responsive

| Breakpoint | Header | Bottom Nav |
|---|---|---|
| < 768px (móvil) | Solo logo | Visible con los 3 items |
| ≥ 768px (desktop) | Logo + 🌐 + Compartir | Oculto (`hidden md:hidden`) |

---

## Fuera de alcance

- Cambios de color (definidos en Figma)
- Páginas de admin (no tienen nav pública)
- Animaciones de transición de página
- Breadcrumbs (no necesarios dado el árbol de 2 niveles: home → país)
