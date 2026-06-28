import Link from 'next/link'
import type { Country } from '@prisma/client'

type CountryWithCount = Country & {
  _count: { resources: number }
}

const SLUG_TO_ISO: Record<string, string> = {
  spain: 'es',
  usa: 'us',
  colombia: 'co',
  brazil: 'br',
  argentina: 'ar',
  peru: 'pe',
  chile: 'cl',
  mexico: 'mx',
  ecuador: 'ec',
  france: 'fr',
  italy: 'it',
  germany: 'de',
  portugal: 'pt',
  panama: 'pa',
  uruguay: 'uy',
  venezuela: 've',
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
        const iso = SLUG_TO_ISO[country.slug]
        const count = country._count.resources

        return (
          <Link
            key={country.slug}
            href={`/${locale}/${country.slug}`}
            className="flex items-center justify-between h-14 px-5 bg-white border-b border-black/[0.08] hover:bg-guacamaya/5 transition-colors"
          >
            <div className="flex items-center gap-3">
              {iso ? (
                <img
                  src={`https://flagcdn.com/w40/${iso}.png`}
                  srcSet={`https://flagcdn.com/w80/${iso}.png 2x`}
                  width={30}
                  height={20}
                  alt=""
                  className="object-cover shrink-0"
                />
              ) : (
                <span className="text-xl shrink-0 w-[30px] text-center leading-none">{country.flag}</span>
              )}
              <div>
                <p className="font-sans font-semibold text-base text-[#141414] leading-tight">{name}</p>
                {count > 0 && (
                  <p className="font-sans font-light text-[13px] text-[#808080] leading-tight">
                    {count} recursos
                  </p>
                )}
              </div>
            </div>
            <span className="text-guacamaya text-sm font-sans" aria-hidden="true">›</span>
          </Link>
        )
      })}
    </div>
  )
}
