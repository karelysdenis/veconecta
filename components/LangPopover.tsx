'use client'

import { useState, useRef, useEffect } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { usePathname, useRouter } from 'next/navigation'
import { effectiveLocalesForCountry } from '@/lib/locale-content'
import type { ActiveLocale } from '@/lib/locale-active'

export function LangPopover({
  direction = 'up',
  className,
  activeLocales,
  countryLocaleMap,
}: {
  direction?: 'up' | 'down'
  className?: string
  activeLocales: ActiveLocale[]
  countryLocaleMap: Record<string, string[]>
}) {
  const [open, setOpen] = useState(false)
  const locale = useLocale()
  const pathname = usePathname()
  const router = useRouter()
  const ref = useRef<HTMLDivElement>(null)
  const t = useTranslations('nav')

  // /es/spain/... → 'spain'; '' on the homepage or non-country pages, which
  // means "no restriction" (effectiveLocalesForCountry falls back to the
  // full active set for any slug with no entry in countryLocaleMap).
  const countrySlug = pathname.split('/')[2] ?? ''
  const locales = effectiveLocalesForCountry(
    countrySlug,
    activeLocales.map((l) => l.code),
    countryLocaleMap,
  )
  const options = activeLocales.filter((l) => locales.includes(l.code))

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function switchLocale(newLocale: string) {
    setOpen(false)
    // Reemplaza el segmento de locale en la URL: /es/spain → /en/spain
    const newPath = pathname.replace(`/${locale}`, `/${newLocale}`)
    router.push(newPath)
  }

  const popoverPosition =
    direction === 'up'
      ? 'bottom-full mb-2 right-0'
      : 'top-full mt-2 right-0'

  return (
    <div ref={ref} className={`relative ${className ?? ''}`}>
      <button
        onClick={() => setOpen(!open)}
        aria-label={t('changeLanguage')}
        aria-expanded={open}
        className="flex items-center justify-center"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="w-5 h-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
          />
        </svg>
      </button>

      {open && (
        <div
          className={`absolute ${popoverPosition} bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden min-w-[140px] z-50`}
        >
          {options.map((l) => (
            <button
              key={l.code}
              onClick={() => switchLocale(l.code)}
              className="w-full flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-gray-50 text-left"
            >
              {l.code === locale ? (
                <svg
                  className="w-4 h-4 text-red-700 shrink-0"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              ) : (
                <span className="w-4 shrink-0" />
              )}
              <span
                className={
                  l.code === locale
                    ? 'font-medium text-gray-900'
                    : 'text-gray-600'
                }
              >
                {l.label}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
