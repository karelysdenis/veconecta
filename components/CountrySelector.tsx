import Link from 'next/link'
import type { Country } from '@prisma/client'

export function CountrySelector({
  countries,
  locale,
}: {
  countries: Country[]
  locale: string
}) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
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
            className="flex flex-col items-center justify-center gap-2 rounded-xl border border-gray-200 p-4 hover:border-red-300 hover:bg-red-50 transition-colors text-center"
          >
            <span className="text-4xl">{country.flag}</span>
            <span className="text-sm font-medium text-gray-900">{name}</span>
          </Link>
        )
      })}
    </div>
  )
}
