import Link from 'next/link'
import type { Country } from '@prisma/client'

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
    <div className="flex flex-col divide-y divide-gray-200">
      {countries.map((country) => {
        const name =
          locale === 'en'
            ? country.nameEn
            : locale === 'pt'
              ? (country.namePt ?? country.nameEs)
              : country.nameEs
        return (
          <Link
            key={country.slug}
            href={`/${locale}/${country.slug}`}
            className="flex items-center gap-3 py-4 hover:bg-guacamaya/5 -mx-4 px-4 transition-colors"
          >
            <img
              src={`https://flagcdn.com/${country.slug}.svg`}
              width={32}
              height={24}
              alt=""
              className="rounded-sm object-cover shrink-0"
            />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-selva text-sm leading-tight">{name}</p>
              {country._count.resources > 0 && (
                <p className="text-xs text-gray-500 mt-0.5">
                  {country._count.resources} recursos
                </p>
              )}
            </div>
            <svg
              className="w-4 h-4 text-gray-400 shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        )
      })}
    </div>
  )
}
