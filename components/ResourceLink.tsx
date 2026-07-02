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

  return (
    <Link
      href={`/${locale}/recursos/${resource.id}`}
      className="flex items-center justify-between gap-3 min-h-14 px-5 py-3 border-t border-[rgba(20,20,20,0.08)] hover:bg-guacamaya/5 transition-colors"
    >
      <div className="flex-1 min-w-0">
        <p className="font-sans font-normal text-[15px] text-[#141414] leading-snug">
          {name}
        </p>
        {notes && (
          <p className="font-sans font-light text-[13px] text-[#808080] mt-0.5 leading-snug line-clamp-1">
            {notes}
          </p>
        )}
        {expiresStr && (
          <span className="inline-flex items-center font-sans font-medium text-[11px] text-guacamaya bg-amber-50 rounded-full px-2 py-0.5 mt-1">
            {tDetail('expiresOn')} {expiresStr}
          </span>
        )}
      </div>
      <span className="text-[#b8b8b8] text-base shrink-0 select-none">›</span>
    </Link>
  )
}
