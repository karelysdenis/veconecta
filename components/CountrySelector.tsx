import Link from 'next/link'
import type { Country } from '@prisma/client'
import { flagUrl } from '@/lib/country-iso'

type CountryWithCount = Country & {
  _count: { resources: number }
}

export function CountrySelector({
  countries,
  locale,
}: {
  countries: CountryWithCount[]
  locale: string
}) {
  return (
    <div>
      {countries.map((country) => {
        const name =
          locale === 'en'
            ? country.nameEn
            : locale === 'pt'
              ? (country.namePt ?? country.nameEs)
              : country.nameEs
        const flag40 = flagUrl(country.slug, 'w40')
        const flag80 = flagUrl(country.slug, 'w80')

        return (
          <Link
            key={country.slug}
            href={`/${locale}/${country.slug}`}
            className="flex items-center justify-between h-14 px-5 bg-white border-b border-black/[0.08] hover:bg-guacamaya/5 transition-colors"
          >
            <div className="flex items-center gap-3">
              {flag40 ? (
                <img
                  src={flag40}
                  srcSet={flag80 ? `${flag80} 2x` : undefined}
                  width={30}
                  height={20}
                  alt=""
                  className="object-cover shrink-0"
                />
              ) : (
                <span className="text-xl shrink-0 w-[30px] text-center leading-none">{country.flag}</span>
              )}
              <p className="font-sans font-semibold text-base text-[#141414] leading-tight">{name}</p>
            </div>
            <span className="text-guacamaya text-sm font-sans" aria-hidden="true">›</span>
          </Link>
        )
      })}
    </div>
  )
}
