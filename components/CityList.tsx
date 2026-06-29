import Link from 'next/link'
import { MapPin } from 'lucide-react'
import { useTranslations } from 'next-intl'

export type CityEntry = {
  name: string
  slug: string
  count: number
}

export function CityList({
  cities,
  countrySlug,
  locale,
}: {
  cities: CityEntry[]
  countrySlug: string
  locale: string
}) {
  const t = useTranslations('city')

  return (
    <div>
      {/* City rows */}
      <div>
        {cities.map((city) => (
          <Link
            key={city.slug}
            href={`/${locale}/${countrySlug}/${city.slug}`}
            className="flex items-center gap-4 px-5 h-16 border-t border-[rgba(20,20,20,0.08)] hover:bg-guacamaya/5 transition-colors group"
          >
            <div className="w-9 h-9 rounded-full bg-coco flex items-center justify-center shrink-0">
              <MapPin className="w-[18px] h-[18px] text-caribe" strokeWidth={1.5} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-sans font-semibold text-[15px] text-[#141414] leading-tight">
                {city.name}
              </p>
            </div>
            <span className="font-sans text-sm text-guacamaya shrink-0 group-hover:translate-x-0.5 transition-transform">
              ›
            </span>
          </Link>
        ))}
      </div>
    </div>
  )
}
