import Link from 'next/link'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { prisma } from '@/lib/prisma'
import { ResourceCategory, ResourceStatus } from '@prisma/client'
import { SearchResultLink } from '@/components/SearchResultLink'
import { SearchInput } from '@/components/SearchInput'
import { Users, Heart, ArrowLeftRight, Phone, Package, Globe, Landmark, Brain, type LucideIcon } from 'lucide-react'
import { getLocalizedSlug } from '@/lib/country-slug'
import { localizeSuffixed } from '@/lib/locale-content'
import type { Metadata } from 'next'

const GLOBAL_SELECT = {
  id: true,
  name: true,
  nameEn: true,
  namePt: true,
  nameFr: true,
  nameDe: true,
  category: true,
  countrySlug: true,
  notesEs: true,
  notesEn: true,
  notesPt: true,
  notesFr: true,
  notesDe: true,
  country: { select: { nameEs: true, nameEn: true, namePt: true, nameFr: true, nameDe: true, cca2: true } },
} as const

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

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ q?: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const { q = '' } = await searchParams
  const query = q.trim().slice(0, 100)

  const t = await getTranslations({ locale, namespace: 'search' })
  if (!query) {
    return { title: `${t('title')} | VeConecta` }
  }
  return { title: `"${query}" — ${t('title')} | VeConecta` }
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

  const query = q.trim().slice(0, 100)

  const [tNav, tCat, tSearch] = await Promise.all([
    getTranslations('nav'),
    getTranslations('categories'),
    getTranslations('search'),
  ])

  const matchingCountries = query.length >= 2
    ? await prisma.country.findMany({
        where: {
          active: true,
          OR: [
            { nameEs: { contains: query, mode: 'insensitive' } },
            { nameEn: { contains: query, mode: 'insensitive' } },
            { namePt: { contains: query, mode: 'insensitive' } },
            { nameFr: { contains: query, mode: 'insensitive' } },
            { nameDe: { contains: query, mode: 'insensitive' } },
          ],
        },
        select: {
          slug: true, slugEs: true, slugEn: true, slugPt: true, slugFr: true, slugDe: true,
          nameEs: true, nameEn: true, namePt: true, nameFr: true, nameDe: true, cca2: true,
        },
      })
    : []
  const countrySlugs = matchingCountries.map(c => c.slug)

  const results = query.length >= 2
    ? await prisma.resource.findMany({
        where: {
          status: ResourceStatus.PUBLISHED,
          OR: [
            { name: { contains: query, mode: 'insensitive' } },
            { nameEn: { contains: query, mode: 'insensitive' } },
            { namePt: { contains: query, mode: 'insensitive' } },
            { nameFr: { contains: query, mode: 'insensitive' } },
            { nameDe: { contains: query, mode: 'insensitive' } },
            { notesEs: { contains: query, mode: 'insensitive' } },
            { notesEn: { contains: query, mode: 'insensitive' } },
            { notesPt: { contains: query, mode: 'insensitive' } },
            { notesFr: { contains: query, mode: 'insensitive' } },
            { notesDe: { contains: query, mode: 'insensitive' } },
            ...(countrySlugs.length > 0 ? [{ countrySlug: { in: countrySlugs } }] : []),
          ],
        },
        select: GLOBAL_SELECT,
        orderBy: { createdAt: 'asc' },
        take: 100,
      })
    : []

  const fallback = query.length >= 2 && results.length === 0
    ? await prisma.resource.findMany({
        where: { status: ResourceStatus.PUBLISHED, countrySlug: 'global' },
        select: GLOBAL_SELECT,
        orderBy: { createdAt: 'asc' },
        take: 50,
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

  const placeholder = tSearch('placeholder')
  const resultsText = tSearch('resultsCount', { count: total, query })
  const searchLabel = tSearch('title')

  return (
    <main className="min-h-screen bg-white">
      {/* Breadcrumb */}
      <div className="bg-coco h-10 flex items-center px-5 gap-1.5">
        <Link
          href={`/${locale}`}
          className="font-sans font-normal text-sm text-caribe hover:underline shrink-0"
        >
          {tNav('home')}
        </Link>
        <span className="font-sans text-sm text-[#b8b8b8] shrink-0">›</span>
        <span className="font-sans font-normal text-sm text-[#141414] shrink-0">{searchLabel}</span>
      </div>

      {/* Search bar */}
      <div className="px-5 py-4 border-b border-[rgba(20,20,20,0.08)]">
        <SearchInput placeholder={placeholder} defaultValue={query} locale={locale} />
      </div>

      {/* Status */}
      {query.length >= 2 && total > 0 && (
        <div className="px-5 py-3">
          <p className="font-sans font-light text-[13px] text-[#808080]">{resultsText}</p>
        </div>
      )}

      {query.length < 2 && (
        <div className="px-5 py-10 text-center">
          <p className="font-sans font-light text-[15px] text-[#808080]">
            {tSearch('typeHint')}
          </p>
        </div>
      )}

      {/* Países encontrados */}
      {matchingCountries.length > 0 && matchingCountries.map(c => {
        const name = localizeSuffixed(c, 'name', locale) ?? c.nameEs
        const flagSrc = c.cca2 ? `https://flagcdn.com/w40/${c.cca2}.png` : null
        return (
          <div key={c.slug}>
            <div className="h-px bg-[rgba(20,20,20,0.12)]" />
            <Link
              href={`/${locale}/${getLocalizedSlug(c, locale)}`}
              className="flex items-center gap-3 h-14 px-5 hover:bg-guacamaya/5 transition-colors"
            >
              {flagSrc && <img src={flagSrc} width={24} height={16} alt="" className="object-cover rounded-[2px] shrink-0" />}
              <span className="font-sans font-semibold text-base text-[#141414]">{name}</span>
              <span className="ml-auto text-[#b8b8b8] text-base shrink-0 select-none">›</span>
            </Link>
          </div>
        )
      })}

      {/* Results by category */}
      {total > 0 && CATEGORY_ORDER.map((cat) => {
        const catResults = byCategory[cat]
        if (catResults.length === 0) return null
        const Icon = CATEGORY_ICONS[cat]

        return (
          <div key={cat}>
            <div className="h-px bg-[rgba(20,20,20,0.12)]" />
            <div className="flex items-center gap-3.5 h-14 px-5">
              <div className="w-9 h-9 rounded-full bg-coco flex items-center justify-center shrink-0">
                <Icon className="w-[18px] h-[18px] text-[#184e68]" strokeWidth={1.5} />
              </div>
              <span className="font-sans font-semibold text-base text-[#141414]">
                {tCat(cat)}
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

      {/* Fallback: globales cuando no hay resultados */}
      {fallback.length > 0 && (
        <>
          <div className="px-5 py-3">
            <p className="font-sans font-light text-[13px] text-[#808080]">
              {tSearch('fallbackIntro', { query })}
            </p>
          </div>
          <div className="px-5 pt-4 pb-6 flex justify-center">
            <div className="flex items-center gap-3">
              <Globe className="w-[22px] h-[22px] text-[#184e68]" strokeWidth={1.5} />
              <span className="font-display font-bold text-[22px] text-[#141414]">{tSearch('international')}</span>
            </div>
          </div>
          {fallback.map((r) => (
            <SearchResultLink key={r.id} resource={r} locale={locale} />
          ))}
          <div className="h-px bg-[rgba(20,20,20,0.12)]" />
        </>
      )}
    </main>
  )
}
