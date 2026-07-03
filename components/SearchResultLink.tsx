import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { flagUrl as isoFlagUrl } from '@/lib/country-iso'
import { getResourceName, type SerializedCity } from '@/lib/types'
import { localizeSuffixed, formatEventRange, type Locale } from '@/lib/locale-content'
import type { ResourceKind } from '@prisma/client'

type ResourceWithCountry = {
  id: string
  name: string
  countrySlug: string
  kind: ResourceKind
  eventStartsAt: Date | null
  eventEndsAt: Date | null
  country: {
    nameEs: string
    cca2: string | null
  }
  city: SerializedCity | null
}

export function SearchResultLink({
  resource,
  locale,
}: {
  resource: ResourceWithCountry
  locale: string
}) {
  const t = useTranslations('search')
  const name = getResourceName(resource, locale)
  const notes = localizeSuffixed(resource, 'notes', locale)
  const countryName = localizeSuffixed(resource.country, 'name', locale) ?? resource.country.nameEs
  const cityName = resource.city
    ? (localizeSuffixed(resource.city, 'name', locale) ?? resource.city.nameEs)
    : null
  const cityHref = resource.city ? `/${locale}/${resource.countrySlug}/${resource.city.slug}` : null
  const eventRangeStr = resource.kind === 'EVENT'
    ? formatEventRange(
        resource.eventStartsAt?.toISOString() ?? null,
        resource.eventEndsAt?.toISOString() ?? null,
        locale as Locale,
      )
    : null

  const isGlobal = resource.countrySlug === 'global'

  const flagSrc = resource.country.cca2
    ? `https://flagcdn.com/w40/${resource.country.cca2}.png`
    : isoFlagUrl(resource.countrySlug, 'w40')

  return (
    <div className="relative flex items-center justify-between gap-3 min-h-14 px-5 py-3 border-t border-[rgba(20,20,20,0.08)] hover:bg-guacamaya/5 transition-colors">
      <Link
        href={`/${locale}/recursos/${resource.id}`}
        className="absolute inset-0"
        aria-label={name}
      />
      <div className="flex-1 min-w-0 pointer-events-none">
        <p className="font-sans font-normal text-[15px] text-[#141414] leading-snug">
          {name}
        </p>
        {notes && (
          <p className="font-sans font-light text-[13px] text-[#808080] mt-0.5 leading-snug line-clamp-1">
            {notes}
          </p>
        )}
        <div className="flex items-center gap-1.5 mt-1">
          {cityName && cityHref && (
            <Link
              href={cityHref}
              className="pointer-events-auto relative z-10 font-sans text-[11px] text-[#808080] bg-gray-100 rounded-full px-2 py-0.5 hover:bg-gray-200 transition-colors"
            >
              {cityName}
            </Link>
          )}
          {eventRangeStr && (
            <span className="inline-flex items-center font-sans font-medium text-[11px] text-caribe bg-caribe/10 rounded-full px-2 py-0.5">
              📅 {eventRangeStr}
            </span>
          )}
          {isGlobal ? (
            <span className="font-sans text-[11px] text-[#808080] bg-gray-100 rounded-full px-2 py-0.5">
              {t('international')}
            </span>
          ) : (
            <>
              {flagSrc && (
                <img
                  src={flagSrc}
                  width={14}
                  height={10}
                  alt=""
                  className="object-cover rounded-[2px] shrink-0"
                />
              )}
              <span className="font-sans text-[12px] text-[#808080]">
                {countryName}
              </span>
            </>
          )}
        </div>
      </div>
      <span className="text-[#b8b8b8] text-base shrink-0 select-none pointer-events-none">›</span>
    </div>
  )
}
