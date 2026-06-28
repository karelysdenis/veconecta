'use client'
import { useState } from 'react'
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
  const [filter, setFilter] = useState('')

  const visible = filter
    ? cities.filter((c) =>
        c.name.toLowerCase().includes(filter.toLowerCase()),
      )
    : cities

  return (
    <div>
      {/* Section label */}
      <div className="px-5 pt-4 pb-2">
        <p className="font-sans font-semibold text-[11px] tracking-[0.08em] uppercase text-[#808080]">
          {t('activeSection')}
        </p>
      </div>

      {/* Search */}
      <div className="px-5 pb-3">
        <div className="flex items-center gap-2 h-10 px-3 rounded-lg bg-coco border border-[rgba(20,20,20,0.08)]">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[#808080] shrink-0">
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
          </svg>
          <input
            type="text"
            placeholder={t('filterPlaceholder')}
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="flex-1 bg-transparent font-sans text-sm text-[#141414] placeholder:text-[#b8b8b8] outline-none"
          />
        </div>
      </div>

      {/* City rows */}
      <div>
        {visible.map((city) => (
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
              <p className="font-sans font-light text-[13px] text-[#808080] leading-none mt-0.5">
                {t('resources', { count: city.count })}
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
