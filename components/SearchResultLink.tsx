import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { flagUrl as isoFlagUrl } from '@/lib/country-iso'
import { getResourceName } from '@/lib/types'
import { localizeSuffixed } from '@/lib/locale-content'

type ResourceWithCountry = {
  id: string
  name: string
  countrySlug: string
  country: {
    nameEs: string
    cca2: string | null
  }
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

  const isGlobal = resource.countrySlug === 'global'

  const flagSrc = resource.country.cca2
    ? `https://flagcdn.com/w40/${resource.country.cca2}.png`
    : isoFlagUrl(resource.countrySlug, 'w40')

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
        <div className="flex items-center gap-1.5 mt-1">
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
      <span className="text-[#b8b8b8] text-base shrink-0 select-none">›</span>
    </Link>
  )
}
