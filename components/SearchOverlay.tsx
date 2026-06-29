'use client'
import { useState, useEffect, useRef } from 'react'
import { Search, X, Users, Heart, ArrowLeftRight, Phone, Package, Globe, Landmark, Brain } from 'lucide-react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import type { ResourceCategory } from '@prisma/client'
import { flagUrl as isoFlagUrl } from '@/lib/country-iso'

type Result = {
  id: string
  name: string
  notesEs: string | null
  notesEn: string | null
  notesPt: string | null
  category: ResourceCategory
  countrySlug: string
  country: {
    nameEs: string
    nameEn: string
    namePt: string | null
    flag: string
    cca2: string | null
  }
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

export function SearchOverlay({ locale }: { locale: string }) {
  const tCat = useTranslations('categories')
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Result[]>([])
  const [fallback, setFallback] = useState<Result[]>([])
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const lang = locale === 'en' ? 'en' : locale === 'pt' ? 'pt' : 'es'

  const placeholder =
    lang === 'en' ? 'Search resources…'
    : lang === 'pt' ? 'Pesquisar…'
    : 'Buscar recursos…'

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
    if (v.trim().length < 2) { setResults([]); setFallback([]); return }
    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(v.trim())}`)
        const data = await res.json()
        setResults(data.results)
        setFallback(data.fallback)
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
        className="p-0.5"
        aria-label="Buscar"
      >
        <Search size={18} strokeWidth={1.5} />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 bg-white flex flex-col">
          {/* Search bar */}
          <div className="shrink-0 border-b border-[rgba(20,20,20,0.08)]">
            <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
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
                aria-label="Cerrar"
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
                  {lang === 'en' ? 'Type to search…' : lang === 'pt' ? 'Digite para pesquisar…' : 'Escribe para buscar…'}
                </p>
              )}

              {/* Estado: cargando */}
              {loading && (
                <p className="px-5 py-4 font-sans font-light text-[13px] text-[#808080]">
                  {lang === 'en' ? 'Searching…' : lang === 'pt' ? 'Pesquisando…' : 'Buscando…'}
                </p>
              )}

              {/* Estado: sin resultados */}
              {!loading && query.length >= 2 && total === 0 && !showFallback && (
                <p className="px-5 py-10 text-center font-sans font-light text-[15px] text-[#808080]">
                  {lang === 'en' ? `No results for "${query}"`
                    : lang === 'pt' ? `Sem resultados para "${query}"`
                    : `Sin resultados para "${query}"`}
                </p>
              )}

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
                      <ResultRow key={r.id} result={r} locale={locale} lang={lang} onClose={close} />
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
                      {lang === 'en'
                        ? `No results for "${query}". These resources are available from any country:`
                        : lang === 'pt'
                        ? `Sem resultados para "${query}". Estes recursos estão disponíveis de qualquer país:`
                        : `Sin resultados para "${query}". Estos recursos están disponibles desde cualquier país:`}
                    </p>
                  </div>
                  <div className="px-5 pt-4 pb-6 flex justify-center">
                    <div className="flex items-center gap-3">
                      <Globe className="w-[22px] h-[22px] text-[#184e68]" strokeWidth={1.5} />
                      <span className="font-display font-bold text-[22px] text-[#141414]">Internacional</span>
                    </div>
                  </div>
                  {fallback.map(r => (
                    <ResultRow key={r.id} result={r} locale={locale} lang={lang} onClose={close} />
                  ))}
                  <div className="h-px bg-[rgba(20,20,20,0.12)]" />
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function ResultRow({
  result, locale, lang, onClose,
}: {
  result: Result
  locale: string
  lang: 'es' | 'en' | 'pt'
  onClose: () => void
}) {
  const notes =
    lang === 'en' ? (result.notesEn ?? result.notesEs)
    : lang === 'pt' ? (result.notesPt ?? result.notesEs)
    : result.notesEs

  const countryName =
    lang === 'en' ? result.country.nameEn
    : lang === 'pt' ? (result.country.namePt ?? result.country.nameEs)
    : result.country.nameEs

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
        <p className="font-sans font-normal text-[15px] text-[#141414] leading-snug">{result.name}</p>
        {notes && (
          <p className="font-sans font-light text-[13px] text-[#808080] mt-0.5 leading-snug line-clamp-1">{notes}</p>
        )}
        <div className="flex items-center gap-1.5 mt-1">
          {isGlobal ? (
            <span className="font-sans text-[11px] text-[#808080] bg-gray-100 rounded-full px-2 py-0.5">Internacional</span>
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
