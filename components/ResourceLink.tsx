'use client'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import type { SerializedResource } from '@/lib/types'
import { getResourceName } from '@/lib/types'
import { localizeSuffixed, INTL_LOCALE, type Locale } from '@/lib/locale-content'

export function ResourceLink({
  resource,
  locale,
}: {
  resource: SerializedResource
  locale: Locale
}) {
  const tDetail = useTranslations('resourceDetail')
  const name = getResourceName(resource, locale)
  const notes = localizeSuffixed(resource, 'notes', locale)

  const fmt = (iso: string) =>
    new Intl.DateTimeFormat(INTL_LOCALE[locale], {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(new Date(iso))

  const expiresStr = resource.validUntil ? fmt(resource.validUntil) : null
  const cityName = resource.city
    ? (localizeSuffixed(resource.city, 'name', locale) ?? resource.city.nameEs)
    : null
  const cityHref = resource.city ? `/${locale}/${resource.countrySlug}/${resource.city.slug}` : null

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
        {(cityName || expiresStr) && (
          <div className="flex items-center gap-1.5 mt-1">
            {cityName && cityHref && (
              <Link
                href={cityHref}
                className="pointer-events-auto relative z-10 font-sans text-[11px] text-[#808080] bg-gray-100 rounded-full px-2 py-0.5 hover:bg-gray-200 transition-colors"
              >
                {cityName}
              </Link>
            )}
            {expiresStr && (
              <span className="inline-flex items-center font-sans font-medium text-[11px] text-guacamaya bg-amber-50 rounded-full px-2 py-0.5">
                {tDetail('expiresOn')} {expiresStr}
              </span>
            )}
          </div>
        )}
      </div>
      <span className="text-[#b8b8b8] text-base shrink-0 select-none pointer-events-none">›</span>
    </div>
  )
}
