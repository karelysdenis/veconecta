import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { prisma } from '@/lib/prisma'
import { ReportForm } from '@/components/ReportForm'
import { localizeBare, localizeSuffixed, formatEventRange, INTL_LOCALE, type Locale } from '@/lib/locale-content'
import { ResourceCategory, ResourceStatus } from '@prisma/client'
import type { Metadata } from 'next'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; id: string }>
}): Promise<Metadata> {
  const { locale, id } = await params
  const resource = await prisma.resource.findUnique({ where: { id } })
  if (!resource) return {}
  const resourceName = localizeBare(resource, 'name', locale)
  return {
    title: `${resourceName} | VEconecta`,
    description: localizeSuffixed(resource, 'notes', locale) ?? undefined,
  }
}

export default async function ResourceDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>
}) {
  const { locale, id } = await params
  setRequestLocale(locale)

  const [tNav, tDetail, tCat] = await Promise.all([
    getTranslations('nav'),
    getTranslations('resourceDetail'),
    getTranslations('categories'),
  ])

  const resource = await prisma.resource.findUnique({
    where: { id, status: ResourceStatus.PUBLISHED },
    include: { country: true, city: true },
  })

  if (!resource) notFound()

  const countryName = localizeSuffixed(resource.country, 'name', locale) ?? resource.country.nameEs
  const displayName = localizeBare(resource, 'name', locale)
  const notes = localizeSuffixed(resource, 'notes', locale)
  const categoryLabel = tCat(resource.category)
  const cityName = resource.city ? (localizeSuffixed(resource.city, 'name', locale) ?? resource.city.nameEs) : null

  const intlLocale = INTL_LOCALE[locale as Locale] ?? INTL_LOCALE.es
  const fmt = (date: Date) =>
    new Intl.DateTimeFormat(intlLocale, { day: 'numeric', month: 'short', year: 'numeric' }).format(date)

  const verifiedDate = resource.verifiedAt ? fmt(resource.verifiedAt) : null
  const isEvent = resource.kind === 'EVENT'
  const validUntilDate = !isEvent && resource.validUntil ? fmt(resource.validUntil) : null
  const eventRangeStr = isEvent
    ? formatEventRange(
        resource.eventStartsAt?.toISOString() ?? null,
        resource.eventEndsAt?.toISOString() ?? null,
        locale as Locale,
      )
    : null

  const isGlobal = resource.countrySlug === 'global'
  const countrySlug = isGlobal ? null : resource.countrySlug

  const urlDisplay = resource.url
    ? resource.url.replace(/^https?:\/\//, '').replace(/\/$/, '')
    : null

  return (
    <main className="min-h-screen bg-white pb-10">
      {/* Breadcrumb */}
      <div className="bg-coco h-10 flex items-center px-5 gap-1.5 overflow-x-auto whitespace-nowrap">
        <Link href={`/${locale}`} className="font-sans font-normal text-sm text-caribe hover:underline shrink-0">
          {tNav('home')}
        </Link>
        {countrySlug && (
          <>
            <span className="font-sans text-sm text-[#b8b8b8] shrink-0">›</span>
            <Link href={`/${locale}/${countrySlug}`} className="font-sans font-normal text-sm text-caribe hover:underline shrink-0">
              {countryName}
            </Link>
          </>
        )}
        <span className="font-sans text-sm text-[#b8b8b8] shrink-0">›</span>
        <span className="font-sans font-normal text-sm text-[#141414] shrink-0">{categoryLabel}</span>
      </div>

      <div className="px-5 pt-5 pb-6 space-y-5">
        {/* Name + meta */}
        <div>
          <h1 className="font-display font-extrabold text-[28px] leading-[1.1] tracking-[-0.01em] text-[#141414]">
            {displayName}
          </h1>
          {eventRangeStr && (
            <span className="inline-flex items-center font-sans font-medium text-[11px] text-caribe bg-caribe/10 rounded-full px-2 py-0.5 mt-2">
              📅 {eventRangeStr}
            </span>
          )}
          {validUntilDate && (
            <span className="inline-flex items-center font-sans font-medium text-[11px] text-guacamaya bg-amber-50 rounded-full px-2 py-0.5 mt-2">
              {tDetail('expiresOn')} {validUntilDate}
            </span>
          )}
        </div>

        {/* Description */}
        {notes && (
          <p className="font-sans font-light text-[15px] text-[#141414] leading-relaxed">
            {notes}
          </p>
        )}

        {/* Key info */}
        {(resource.url || resource.phone || resource.bizum || resource.address || resource.schedule || resource.free || cityName) && (
          <div className="divide-y divide-[rgba(20,20,20,0.08)] border-t border-[rgba(20,20,20,0.08)]">
            {cityName && (
              <div className="py-3 flex items-center justify-between gap-4">
                <span className="font-sans text-[13px] text-[#808080] shrink-0">{tDetail('city')}</span>
                <span className="font-sans text-[13px] text-[#141414]">{cityName}</span>
              </div>
            )}
            {resource.free && (
              <div className="py-3 flex items-center justify-between">
                <span className="font-sans text-[13px] text-[#808080]">{tDetail('free')}</span>
                <span className="font-sans font-semibold text-[13px] text-[#141414]">✓</span>
              </div>
            )}
            {resource.url && urlDisplay && (
              <div className="py-3 flex items-start justify-between gap-4">
                <span className="font-sans text-[13px] text-[#808080] shrink-0">{tDetail('website')}</span>
                <a
                  href={resource.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-sans text-[13px] text-caribe text-right break-all"
                >
                  {urlDisplay}
                </a>
              </div>
            )}
            {resource.bizum && (
              <div className="py-3 flex items-center justify-between gap-4">
                <span className="font-sans text-[13px] text-[#808080] shrink-0">{tDetail('bizum')}</span>
                <span className="font-sans font-semibold text-[13px] text-[#141414]">{resource.bizum}</span>
              </div>
            )}
            {resource.phone && (
              <div className="py-3 flex items-center justify-between gap-4">
                <span className="font-sans text-[13px] text-[#808080] shrink-0">{tDetail('phone')}</span>
                <a
                  href={`tel:${resource.phone.replace(/[^+\d]/g, '')}`}
                  className="font-sans text-[13px] text-caribe"
                >
                  {resource.phone}
                </a>
              </div>
            )}
            {resource.address && (
              <div className="py-3 flex items-start justify-between gap-4">
                <span className="font-sans text-[13px] text-[#808080] shrink-0">{tDetail('address')}</span>
                <span className="font-sans text-[13px] text-[#141414] text-right">{resource.address}</span>
              </div>
            )}
            {resource.schedule && (
              <div className="py-3 flex items-start justify-between gap-4">
                <span className="font-sans text-[13px] text-[#808080] shrink-0">{tDetail('schedule')}</span>
                <span className="font-sans text-[13px] text-[#141414] text-right">{resource.schedule}</span>
              </div>
            )}
          </div>
        )}

        {/* CTA */}
        {resource.url && (
          <a
            href={resource.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full h-12 rounded-xl bg-caribe text-white font-sans font-semibold text-[15px] hover:bg-caribe/90 transition-colors"
          >
            {tDetail('goToResource')} ↗
          </a>
        )}
        {resource.phone && !resource.url && (
          <a
            href={`tel:${resource.phone.replace(/[^+\d]/g, '')}`}
            className="flex items-center justify-center gap-2 w-full h-12 rounded-xl bg-caribe text-white font-sans font-semibold text-[15px] hover:bg-caribe/90 transition-colors"
          >
            {tDetail('callNow')} →
          </a>
        )}

        {verifiedDate && (
          <p className="font-sans font-light text-[13px] text-guacamaya text-center">
            {tDetail('verifiedBy')} · {verifiedDate}
          </p>
        )}

        <div className="pt-6 border-t border-[rgba(20,20,20,0.08)]">
          <ReportForm countrySlug={resource.countrySlug} resourceId={resource.id} />
        </div>
      </div>
    </main>
  )
}
