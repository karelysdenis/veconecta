import Link from 'next/link'
import { flagUrl as isoFlagUrl } from '@/lib/country-iso'

type ResourceWithCountry = {
  id: string
  name: string
  notesEs: string | null
  notesEn: string | null
  notesPt: string | null
  countrySlug: string
  country: {
    nameEs: string
    nameEn: string
    namePt: string | null
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
  const notes =
    locale === 'en'
      ? (resource.notesEn ?? resource.notesEs)
      : locale === 'pt'
        ? (resource.notesPt ?? resource.notesEs)
        : resource.notesEs

  const countryName =
    locale === 'en'
      ? resource.country.nameEn
      : locale === 'pt'
        ? (resource.country.namePt ?? resource.country.nameEs)
        : resource.country.nameEs

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
          {resource.name}
        </p>
        {notes && (
          <p className="font-sans font-light text-[13px] text-[#808080] mt-0.5 leading-snug line-clamp-1">
            {notes}
          </p>
        )}
        <div className="flex items-center gap-1.5 mt-1">
          {isGlobal ? (
            <span className="font-sans text-[11px] text-[#808080] bg-gray-100 rounded-full px-2 py-0.5">
              Internacional
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
