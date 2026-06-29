import { setRequestLocale } from 'next-intl/server'
import { prisma } from '@/lib/prisma'
import { ResourceCategory, ResourceStatus } from '@prisma/client'
import { SearchResultLink } from '@/components/SearchResultLink'
import { SearchInput } from '@/components/SearchInput'
import { Users, Heart, ArrowLeftRight, Phone, Package, Globe, Landmark, Brain, type LucideIcon } from 'lucide-react'

const CATEGORY_ORDER: ResourceCategory[] = [
  'FIND_FAMILY',
  'CALL_FREE',
  'DONATE_MONEY',
  'SEND_MONEY',
  'DONATE_PHYSICALLY',
  'DIGITAL_BRIDGE',
  'CONSULAR',
  'MENTAL_HEALTH',
]

const CATEGORY_LABELS: Record<ResourceCategory, { es: string; en: string; pt: string }> = {
  FIND_FAMILY:       { es: 'Buscar familiar',      en: 'Find family',         pt: 'Encontrar familiar' },
  CALL_FREE:         { es: 'Llamadas gratis',       en: 'Free calls',          pt: 'Ligações grátis' },
  DONATE_MONEY:      { es: 'Donar dinero',          en: 'Donate money',        pt: 'Doar dinheiro' },
  SEND_MONEY:        { es: 'Enviar dinero',         en: 'Send money',          pt: 'Enviar dinheiro' },
  DONATE_PHYSICALLY: { es: 'Donación física',       en: 'Physical donation',   pt: 'Doação física' },
  DIGITAL_BRIDGE:    { es: 'Puente digital',        en: 'Digital bridge',      pt: 'Ponte digital' },
  CONSULAR:          { es: 'Servicios consulares',  en: 'Consular services',   pt: 'Serviços consulares' },
  MENTAL_HEALTH:     { es: 'Salud mental',          en: 'Mental health',       pt: 'Saúde mental' },
}

const CATEGORY_ICONS: Record<ResourceCategory, LucideIcon> = {
  FIND_FAMILY: Users,
  DONATE_MONEY: Heart,
  SEND_MONEY: ArrowLeftRight,
  CALL_FREE: Phone,
  DONATE_PHYSICALLY: Package,
  DIGITAL_BRIDGE: Globe,
  CONSULAR: Landmark,
  MENTAL_HEALTH: Brain,
}

export default async function SearchPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ q?: string }>
}) {
  const { locale } = await params
  const { q = '' } = await searchParams
  setRequestLocale(locale)

  const query = q.trim()

  const results = query.length >= 2
    ? await prisma.resource.findMany({
        where: {
          status: ResourceStatus.PUBLISHED,
          OR: [
            { name: { contains: query, mode: 'insensitive' } },
            { notesEs: { contains: query, mode: 'insensitive' } },
            { notesEn: { contains: query, mode: 'insensitive' } },
            { notesPt: { contains: query, mode: 'insensitive' } },
          ],
        },
        include: { country: true },
        orderBy: { createdAt: 'asc' },
      })
    : []

  const byCategory = CATEGORY_ORDER.reduce(
    (acc, cat) => {
      acc[cat] = results.filter((r) => r.category === cat)
      return acc
    },
    {} as Record<ResourceCategory, typeof results>,
  )

  const total = results.length
  const lang = locale === 'en' ? 'en' : locale === 'pt' ? 'pt' : 'es'

  const placeholder =
    lang === 'en' ? 'Search by name, country or category…'
    : lang === 'pt' ? 'Pesquise por nome, país ou categoria…'
    : 'Busca por nombre, país o categoría…'

  const noResultsText =
    lang === 'en' ? `No results for "${query}"`
    : lang === 'pt' ? `Sem resultados para "${query}"`
    : `Sin resultados para "${query}"`

  const resultsText =
    lang === 'en' ? `${total} result${total !== 1 ? 's' : ''} for "${query}"`
    : lang === 'pt' ? `${total} resultado${total !== 1 ? 's' : ''} para "${query}"`
    : `${total} resultado${total !== 1 ? 's' : ''} para "${query}"`

  return (
    <main className="min-h-screen bg-white">
      {/* Search bar */}
      <div className="px-5 py-4 border-b border-[rgba(20,20,20,0.08)]">
        <SearchInput placeholder={placeholder} defaultValue={query} locale={locale} />
      </div>

      {/* Status */}
      {query.length >= 2 && (
        <div className="px-5 py-3">
          <p className="font-sans font-light text-[13px] text-[#808080]">
            {total === 0 ? noResultsText : resultsText}
          </p>
        </div>
      )}

      {query.length < 2 && (
        <div className="px-5 py-10 text-center">
          <p className="font-sans font-light text-[15px] text-[#808080]">
            {lang === 'en' ? 'Type at least 2 characters to search'
              : lang === 'pt' ? 'Digite pelo menos 2 caracteres para pesquisar'
              : 'Escribe al menos 2 caracteres para buscar'}
          </p>
        </div>
      )}

      {/* Results by category */}
      {total > 0 && CATEGORY_ORDER.map((cat) => {
        const catResults = byCategory[cat]
        if (catResults.length === 0) return null
        const Icon = CATEGORY_ICONS[cat]
        const label = CATEGORY_LABELS[cat][lang]

        return (
          <div key={cat}>
            <div className="h-px bg-[rgba(20,20,20,0.12)]" />
            <div className="flex items-center gap-3.5 h-14 px-5">
              <div className="w-9 h-9 rounded-full bg-coco flex items-center justify-center shrink-0">
                <Icon className="w-[18px] h-[18px] text-[#184e68]" strokeWidth={1.5} />
              </div>
              <span className="font-sans font-semibold text-base text-[#141414]">
                {label}
              </span>
              <span className="font-sans text-[12px] font-semibold text-caribe bg-caribe/10 rounded-full px-2 py-0.5 leading-none">
                {catResults.length}
              </span>
            </div>
            {catResults.map((r) => (
              <SearchResultLink key={r.id} resource={r} locale={locale} />
            ))}
          </div>
        )
      })}

      {total > 0 && <div className="h-px bg-[rgba(20,20,20,0.12)]" />}
    </main>
  )
}
