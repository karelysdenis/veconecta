'use client'
import Link from 'next/link'
import { Calendar, MapPin } from 'lucide-react'
import { useTranslations } from 'next-intl'
import type { SerializedResource } from '@/lib/types'
import { getResourceName } from '@/lib/types'
import { localizeSuffixed, formatEventRange, formatEventBadge, type Locale } from '@/lib/locale-content'
import { resourceCanonicalPath } from '@/lib/resource-detail'

export function UpcomingEvents({
  events,
  locale,
}: {
  events: SerializedResource[]
  locale: Locale
}) {
  const tCountry = useTranslations('country')

  const validEvents = events.filter((r) => r.eventStartsAt !== null)

  if (validEvents.length === 0) return null

  return (
    <div>
      <div className="h-px bg-[rgba(20,20,20,0.12)]" />
      <div className="px-5 pt-5 pb-1 flex items-center gap-2">
        <Calendar className="w-4 h-4 text-caribe" strokeWidth={2} />
        <h2 className="font-sans font-semibold text-base text-[#141414]">
          {tCountry('upcomingEvents')}
        </h2>
      </div>
      {validEvents.map((r) => (
        <EventAgendaRow key={r.id} resource={r} locale={locale} />
      ))}
    </div>
  )
}

function EventAgendaRow({
  resource,
  locale,
}: {
  resource: SerializedResource
  locale: Locale
}) {
  const name = getResourceName(resource, locale)
  // `UpcomingEvents` filters out events with a null `eventStartsAt` before rendering
  // this row, so this is guaranteed to be a non-null string here.
  const { day, month } = formatEventBadge(resource.eventStartsAt!, locale)
  const isMultiDay =
    resource.eventStartsAt &&
    resource.eventEndsAt &&
    new Date(resource.eventStartsAt).getTime() !== new Date(resource.eventEndsAt).getTime()
  const rangeStr = isMultiDay
    ? formatEventRange(resource.eventStartsAt, resource.eventEndsAt, locale)
    : null
  const cityName = resource.city
    ? (localizeSuffixed(resource.city, 'name', locale) ?? resource.city.nameEs)
    : null

  return (
    <div className="relative flex items-center gap-3 min-h-14 px-5 py-3 border-t border-[rgba(20,20,20,0.08)] hover:bg-guacamaya/5 transition-colors">
      <Link
        href={resourceCanonicalPath(resource, locale)}
        className="absolute inset-0"
        aria-label={name}
      />
      <div className="w-11 h-11 rounded-[10px] bg-caribe/10 text-caribe flex flex-col items-center justify-center shrink-0 leading-none pointer-events-none">
        <span className="text-base font-extrabold">{day}</span>
        <span className="text-[9px] font-bold uppercase">{month}</span>
      </div>
      <div className="flex-1 min-w-0 pointer-events-none">
        <p className="font-sans font-normal text-[15px] text-[#141414] leading-snug">{name}</p>
        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
          {cityName && (
            <span className="inline-flex items-center gap-1 font-sans font-medium text-[11px] text-caribe bg-caribe/10 rounded-full px-2 py-0.5">
              <MapPin size={11} strokeWidth={2.5} className="shrink-0" />
              {cityName}
            </span>
          )}
          {rangeStr && (
            <span className="font-sans text-[11px] text-[#808080]">{rangeStr}</span>
          )}
        </div>
      </div>
      <span className="text-[#b8b8b8] text-base shrink-0 select-none pointer-events-none">›</span>
    </div>
  )
}
