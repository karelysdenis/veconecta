'use client'
import { useState, useEffect, useRef } from 'react'
import { Search, X, Users, Heart, ArrowLeftRight, Phone, Package, Globe, Landmark, Brain } from 'lucide-react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import type { ResourceCategory } from '@prisma/client'
import { flagUrl as isoFlagUrl } from '@/lib/country-iso'
import { getResourceName } from '@/lib/types'
import { localizeSuffixed } from '@/lib/locale-content'

type Result = {
  id: string
  name: string
  category: ResourceCategory
  countrySlug: string
  country: {
    nameEs: string
    flag: string
    cca2: string | null
  }
}

type CountryResult = {
  slug: string
  nameEs: string
  cca2: string | null
}

const CATEGORY_ORDER: ResourceCategory[] = [
  'FIND_FAMILY', 'CALL_FREE', 'DONATE_MONEY', 'SEND_MONEY',
  'DONATE_PHYSICALLY', 'DIGITAL_BRIDGE', 'CONSULAR', 'MENTAL_HEALTH',
]

const CATEGORY_ICONS = {
  FIND_FAMILY: Users, DONATE_MONEY: Heart, SEND_MONEY: ArrowLeftRight,
  CALL_FREE: Phone, DONATE_PHYSICALLY: Package, DIGITAL_BRIDGE: Globe,
  CONSULAR: Landmark, MENTAL_HEALTH: Brain,
} as const

export function SearchOverlay({
  locale,
  variant = 'icon',
  triggerClassName,
}: {
  locale: string
  variant?: 'icon' | 'tab'
  triggerClassName?: string
}) {
  const tCat = useTranslations('categories')
  const tNav = useTranslations('nav')
  const t = useTranslations('searchOverlay')
  const tSearch = useTranslations('search')
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Result[]>([])
  const [fallback, setFallback] = useState<Result[]>([])
  const [countries, setCountries] = useState<CountryResult[]>([])
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const placeholder = t('placeholder')

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') close() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open])

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50)
  }, [open])

  function handleChange(v: string) {
    setQuery(v)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (v.trim().length < 2) { setResults([]); setFallback([]); setCountries([]); return }
    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(v.trim())}`)
        const data = await res.json()
        setResults(data.results)
        setFallback(data.fallback)
        setCountries(data.countries)
      } finally {
        setLoading(false)
      }
    }, 300)
  }

  function close() {
    setOpen(false)
    setQuery('')
    setResults([])
    setFallback([])
    setCountries([])
  }

  const byCategory = CATEGORY_ORDER.reduce((acc, cat) => {
    acc[cat] = results.filter(r => r.category === cat)
    return acc
  }, {} as Record<ResourceCategory, Result[]>)

  const total = results.length
  const showFallback = !loading && query.length >= 2 && total === 0 && fallback.length > 0

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={
          variant === 'tab'
            ? 'flex flex-1 flex-col items-center justify-center gap-1 py-2 text-xs text-gray-500'
            : `p-0.5 ${triggerClassName ?? ''}`
        }
        aria-label={tNav('search')}
      >
        <Search size={variant === 'tab' ? 20 : 18} strokeWidth={variant === 'tab' ? 2 : 1.5} />
        {variant === 'tab' && <span>{tNav('search')}</span>}
      </button>

      {open && (
        <div
          className={
            variant === 'tab'
              ? 'fixed inset-0 z-50 bg-black/40 flex flex-col justify-end'
              : 'fixed inset-0 z-50 bg-white flex flex-col'
          }
          onClick={
            variant === 'tab'
              ? (e) => { if (e.target === e.currentTarget) close() }
              : undefined
          }
        >
          <div className={variant === 'tab' ? 'bg-white rounded-t-2xl max-h-[85vh] flex flex-col overflow-hidden' : 'contents'}>
            {/* Search bar */}
            <div className="shrink-0 border-b border-[rgba(20,20,20,0.08)]">
              <div className="max-w-2xl mx-auto px-4 h-[68px] flex items-center gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#808080] shrink-0" strokeWidth={1.5} />
                  <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={e => handleChange(e.target.value)}
                    placeholder={placeholder}
                    autoComplete="off"
                    className="w-full bg-gray-100 rounded-xl pl-9 pr-4 py-2.5 text-[15px] font-sans text-[#141414] placeholder:text-[#808080] focus:outline-none focus:ring-2 focus:ring-caribe/30"
                  />
                </div>
                <button
                  type="button"
                  onClick={close}
                  className="shrink-0 p-1 text-[#808080] hover:text-[#141414] transition-colors"
                  aria-label={t('close')}
                >
                  <X size={20} strokeWidth={1.5} />
                </button>
              </div>
            </div>

            {/* Results */}
            <div className="flex-1 overflow-y-auto">
              <div className="max-w-2xl mx-auto">

                {/* Estado: esperando */}
                {query.length < 2 && (
                  <p className="px-5 py-10 text-center font-sans font-light text-[15px] text-[#808080]">
                    {t('typeHint')}
                  </p>
                )}

                {/* Estado: cargando */}
                {loading && (
                  <p className="px-5 py-4 font-sans font-light text-[13px] text-[#808080]">
                    {t('loading')}
                  </p>
                )}

                {/* Estado: sin resultados */}
                {!loading && query.length >= 2 && total === 0 && !showFallback && (
                  <p className="px-5 py-10 text-center font-sans font-light text-[15px] text-[#808080]">
                    {t('noResults', { query })}
                  </p>
                )}

                {/* Países encontrados */}
                {!loading && countries.length > 0 && countries.map(c => {
                  const name = localizeSuffixed(c, 'name', locale) ?? c.nameEs
                  const flagSrc = c.cca2 ? `https://flagcdn.com/w40/${c.cca2}.png` : isoFlagUrl(c.slug, 'w40')
                  return (
                    <div key={c.slug}>
                      <div className="h-px bg-[rgba(20,20,20,0.12)]" />
                      <Link
                        href={`/${locale}/${c.slug}`}
                        onClick={close}
                        className="flex items-center gap-3 h-14 px-5 hover:bg-guacamaya/5 transition-colors"
                      >
                        {flagSrc && <img src={flagSrc} width={24} height={16} alt="" className="object-cover rounded-[2px] shrink-0" />}
                        <span className="font-sans font-semibold text-base text-[#141414]">{name}</span>
                        <span className="ml-auto text-[#b8b8b8] text-base shrink-0 select-none">›</span>
                      </Link>
                    </div>
                  )
                })}

                {/* Resultados agrupados */}
                {!loading && total > 0 && CATEGORY_ORDER.map(cat => {
                  const catResults = byCategory[cat]
                  if (!catResults.length) return null
                  const Icon = CATEGORY_ICONS[cat]
                  return (
                    <div key={cat}>
                      <div className="h-px bg-[rgba(20,20,20,0.12)]" />
                      <div className="flex items-center gap-3.5 h-14 px-5">
                        <div className="w-9 h-9 rounded-full bg-coco flex items-center justify-center shrink-0">
                          <Icon className="w-[18px] h-[18px] text-[#184e68]" strokeWidth={1.5} />
                        </div>
                        <span className="font-sans font-semibold text-base text-[#141414]">{tCat(cat)}</span>
                        <span className="font-sans text-[12px] font-semibold text-caribe bg-caribe/10 rounded-full px-2 py-0.5 leading-none">
                          {catResults.length}
                        </span>
                      </div>
                      {catResults.map(r => (
                        <ResultRow key={r.id} result={r} locale={locale} onClose={close} />
                      ))}
                    </div>
                  )
                })}

                {total > 0 && <div className="h-px bg-[rgba(20,20,20,0.12)]" />}

                {/* Fallback: recursos globales cuando no hay resultados */}
                {showFallback && (
                  <>
                    <div className="px-5 py-4">
                      <p className="font-sans font-light text-[13px] text-[#808080]">
                        {t('fallbackIntro', { query })}
                      </p>
                    </div>
                    <div className="px-5 pt-4 pb-6 flex justify-center">
                      <div className="flex items-center gap-3">
                        <Globe className="w-[22px] h-[22px] text-[#184e68]" strokeWidth={1.5} />
                        <span className="font-display font-bold text-[22px] text-[#141414]">{tSearch('international')}</span>
                      </div>
                    </div>
                    {fallback.map(r => (
                      <ResultRow key={r.id} result={r} locale={locale} onClose={close} />
                    ))}
                    <div className="h-px bg-[rgba(20,20,20,0.12)]" />
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function ResultRow({
  result, locale, onClose,
}: {
  result: Result
  locale: string
  onClose: () => void
}) {
  const tSearch = useTranslations('search')
  const name = getResourceName(result, locale)
  const notes = localizeSuffixed(result, 'notes', locale)
  const countryName = localizeSuffixed(result.country, 'name', locale) ?? result.country.nameEs

  const isGlobal = result.countrySlug === 'global'
  const flagSrc = result.country.cca2
    ? `https://flagcdn.com/w40/${result.country.cca2}.png`
    : isoFlagUrl(result.countrySlug, 'w40')

  return (
    <Link
      href={`/${locale}/recursos/${result.id}`}
      onClick={onClose}
      className="flex items-center justify-between gap-3 min-h-14 px-5 py-3 border-t border-[rgba(20,20,20,0.08)] hover:bg-guacamaya/5 transition-colors"
    >
      <div className="flex-1 min-w-0">
        <p className="font-sans font-normal text-[15px] text-[#141414] leading-snug">{name}</p>
        {notes && (
          <p className="font-sans font-light text-[13px] text-[#808080] mt-0.5 leading-snug line-clamp-1">{notes}</p>
        )}
        <div className="flex items-center gap-1.5 mt-1">
          {isGlobal ? (
            <span className="font-sans text-[11px] text-[#808080] bg-gray-100 rounded-full px-2 py-0.5">{tSearch('international')}</span>
          ) : (
            <>
              {flagSrc && <img src={flagSrc} width={14} height={10} alt="" className="object-cover rounded-[2px] shrink-0" />}
              <span className="font-sans text-[12px] text-[#808080]">{countryName}</span>
            </>
          )}
        </div>
      </div>
      <span className="text-[#b8b8b8] text-base shrink-0 select-none">›</span>
    </Link>
  )
}
