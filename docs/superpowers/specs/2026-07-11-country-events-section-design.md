# Sección "Próximos eventos" en la página de país: diseño

## Contexto

`Resource` ya distingue `kind: PERMANENT | EVENT` (`prisma/schema.prisma:109`). Un evento tiene `eventStartsAt`/`eventEndsAt` opcionales, se filtra por `notPastEventFilter()` (`lib/resource-visibility.ts`) para excluir eventos ya terminados, y `ResourceLink` ya muestra un badge de fecha (`formatEventRange`) cuando `kind === 'EVENT'`.

Hoy, en `app/[locale]/[country]/page.tsx`, los eventos no tienen ninguna vitrina propia: se mezclan dentro de las 8 `ActionCard` por categoría (`CATEGORY_ORDER`), ordenados por `createdAt` junto con los recursos permanentes. No hay forma de ver "qué eventos hay próximamente en este país" de un vistazo.

`countrySlug` distingue recursos de un país específico de los recursos `'global'` (aplicables a cualquier país, ver `app/[locale]/[country]/page.tsx:106-111`). No existe un país "Venezuela": los países del modelo son los países de residencia de la diáspora (España, Francia, Colombia, etc.), y los eventos que interesan aquí son los que ocurren físicamente en ese país (una colecta en Madrid, una jornada consular en Barcelona), no eventos globales/online.

## Objetivo

Agregar una sección "Próximos eventos" en la página de país, **antes** de la lista de categorías, que muestre solo los eventos (`kind: EVENT`) propios de ese país (no los `global`), en formato de agenda ordenada por fecha. Los eventos siguen apareciendo también dentro de su `ActionCard` de categoría más abajo, sin cambios ahí.

Alcance: solo la rama de `CountryPage` que ya renderiza recursos directamente (países sin selector de ciudad, es decir `hasCitySelector === false`). La rama con `CityList` no se toca.

## Diseño

### Estilo visual (validado con mockups)

Agenda simple: una fila por evento con un chip de fecha (día grande + mes abreviado) a la izquierda, nombre del evento, y una línea de metadatos (ciudad · categoría) debajo, con el mismo lenguaje visual que el resto del sitio (`bg-caribe/10`, `text-caribe`, radios y tipografía de `ResourceLink`). Se descartaron una franja horizontal de días estilo carrusel y un mini calendario mensual navegable: ambas añaden estado e interacción (selección de día, navegación entre meses) que no se justifica todavía, ya que no sabemos si un país va a tener más de un puñado de eventos simultáneos.

### Componente `components/UpcomingEvents.tsx`

Server component (sin `useState`, no hay toggle de colapsar como en `ActionCard`; siempre expandido).

```tsx
export function UpcomingEvents({
  events,
  locale,
}: {
  events: SerializedResource[]
  locale: Locale
}) {
  if (events.length === 0) return null

  return (
    <div>
      <div className="h-px bg-[rgba(20,20,20,0.12)]" />
      <div className="px-5 pt-5 pb-1 flex items-center gap-2">
        <Calendar className="w-4 h-4 text-caribe" strokeWidth={2} />
        <h2 className="font-sans font-semibold text-base text-[#141414]">
          {t('country.upcomingEvents')}
        </h2>
      </div>
      {events.map((r) => (
        <EventAgendaRow key={r.id} resource={r} locale={locale} />
      ))}
    </div>
  )
}
```

`EventAgendaRow` (mismo archivo o co-ubicado): link completo a `resourceCanonicalPath(resource, locale)` (mismo patrón `absolute inset-0` que `ResourceLink`), badge día/mes vía un helper nuevo `formatEventBadge`, nombre (`getResourceName`), línea de metadatos con ciudad (si tiene `city`) y categoría (`useTranslations('categories')`, mismo patrón que `ActionCard.tsx:31` con `t(r.category)`), y, solo si el evento dura más de un día, el rango completo (`formatEventRange`) en una segunda línea pequeña.

### Helper `formatEventBadge` en `lib/locale-content.ts`

```ts
/** { day: "14", month: "jul" } para el chip de fecha del evento, en el idioma dado. */
export function formatEventBadge(startIso: string, locale: Locale): { day: string; month: string } {
  const date = new Date(startIso)
  const day = new Intl.DateTimeFormat(INTL_LOCALE[locale], { day: 'numeric' }).format(date)
  const month = new Intl.DateTimeFormat(INTL_LOCALE[locale], { month: 'short' }).format(date)
  return { day, month }
}
```

### Selección y orden de datos en `CountryPage`

Sin query nueva: `country.resources` (ya trae `status: PUBLISHED` + `notPastEventFilter()` + `include: { city: true }`) ya contiene todo lo necesario. Se filtra y ordena en memoria, después de `serializeResource`:

```ts
const upcomingEvents = serializedCountry
  .filter((r) => r.kind === 'EVENT' && r.eventStartsAt !== null)
  .sort((a, b) => new Date(a.eventStartsAt!).getTime() - new Date(b.eventStartsAt!).getTime())
```

Un evento con `kind: EVENT` pero `eventStartsAt` vacío (el admin no lo llenó, el campo no es obligatorio hoy: ver `KindDateFields.tsx`) se excluye de esta sección porque no hay fecha para ordenarlo ni mostrar en el badge. Sigue apareciendo igual en su `ActionCard` de categoría, sin cambios.

Solo eventos del país (`serializedCountry`), no `serializedGlobal`. Decisión explícita: esta sección es "eventos dentro del país", los globales no tienen una ubicación física en ese país.

### Integración en `CountryPage`

En la rama sin selector de ciudad (`app/[locale]/[country]/page.tsx`, después del Hero y antes de `CATEGORY_ORDER.map(...)`):

```tsx
<UpcomingEvents events={upcomingEvents} locale={locale as Locale} />

{CATEGORY_ORDER.map((category) => (
  <ActionCard ... />
))}
```

### Traducciones

Nueva clave `country.upcomingEvents` en los 5 `messages/<locale>.json`:
- es: "Próximos eventos"
- en: "Upcoming events"
- pt: "Próximos eventos"
- fr: "Événements à venir"
- de: "Anstehende Veranstaltungen"

## Fuera de alcance

- No se toca la rama `hasCitySelector` (con `CityList`): por ahora ningún país llega al umbral de `MIN_CITY_RESOURCES` en más de una ciudad, y el usuario confirmó no priorizar ese caso todavía.
- No se agrega paginación ni un tope de eventos mostrados: `notPastEventFilter()` ya limita la lista a eventos no vencidos, y no hay evidencia todavía de que un país vaya a acumular tantos como para necesitar recortar.
- No se hace obligatorio `eventStartsAt` al crear/editar un evento en el admin. Un evento sin fecha simplemente no aparece en esta sección (ver arriba); cambiar esa validación es una decisión aparte, fuera de este trabajo.
- No se añade una página dedicada de eventos (`/[locale]/[country]/eventos`) ni vista de calendario navegable: descartado explícitamente en el mockup.
- No cambia nada en `ResourceLink` ni en cómo se ven los eventos dentro de las `ActionCard` por categoría.

## Testing

- `lib/locale-content.test.ts` (nuevo): casos para `formatEventBadge` con fecha simple en `es`/`en`, verificando el formato de mes abreviado por locale.
- Verificación manual (`/verify` o navegador): país con al menos un evento futuro con fecha y uno sin fecha → el primero aparece en "Próximos eventos" y en su categoría; el segundo solo en su categoría. País sin ningún evento → la sección no se renderiza. Evento multi-día → aparece el rango completo en la fila.
