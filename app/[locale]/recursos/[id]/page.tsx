import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { prisma } from '@/lib/prisma'
import { ReportForm } from '@/components/ReportForm'
import { ResourceCategory, ResourceStatus } from '@prisma/client'
import type { Metadata } from 'next'

const CATEGORY_LABELS: Record<ResourceCategory, { es: string; en: string }> = {
  FIND_FAMILY: { es: 'Localizar familia', en: 'Find family' },
  DONATE_MONEY: { es: 'Donar dinero', en: 'Donate money' },
  SEND_MONEY: { es: 'Enviar dinero', en: 'Send money' },
  CALL_FREE: { es: 'Llamar gratis', en: 'Call for free' },
  DONATE_PHYSICALLY: { es: 'Donar físicamente', en: 'Donate supplies' },
  DIGITAL_BRIDGE: { es: 'Ser puente digital', en: 'Digital bridge' },
  CONSULAR: { es: 'Trámites consulares', en: 'Consular services' },
  MENTAL_HEALTH: { es: 'Apoyo psicológico', en: 'Mental health' },
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; id: string }>
}): Promise<Metadata> {
  const { locale, id } = await params
  const resource = await prisma.resource.findUnique({ where: { id } })
  if (!resource) return {}
  return {
    title: `${resource.name} | VeConecta`,
    description:
      locale === 'en'
        ? (resource.notesEn ?? resource.notesEs ?? undefined)
        : (resource.notesEs ?? undefined),
  }
}

export default async function ResourceDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>
}) {
  const { locale, id } = await params
  setRequestLocale(locale)

  const [tNav, tDetail] = await Promise.all([
    getTranslations('nav'),
    getTranslations('resourceDetail'),
  ])

  const resource = await prisma.resource.findUnique({
    where: { id, status: ResourceStatus.PUBLISHED },
    include: { country: true },
  })

  if (!resource) notFound()

  const countryName =
    locale === 'en'
      ? resource.country.nameEn
      : locale === 'pt'
        ? (resource.country.namePt ?? resource.country.nameEs)
        : resource.country.nameEs

  const notes =
    locale === 'en'
      ? (resource.notesEn ?? resource.notesEs)
      : locale === 'pt'
        ? (resource.notesPt ?? resource.notesEs)
        : resource.notesEs

  const categoryLabel =
    locale === 'en'
      ? CATEGORY_LABELS[resource.category].en
      : CATEGORY_LABELS[resource.category].es

  const verifiedDate = resource.verifiedAt
    ? new Intl.DateTimeFormat(locale === 'en' ? 'en-US' : 'es-ES', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }).format(resource.verifiedAt)
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
            {resource.name}
          </h1>
          {verifiedDate && (
            <p className="font-sans font-light text-[13px] text-[#808080] mt-1">
              {tDetail('verifiedBy')} · {verifiedDate}
            </p>
          )}
        </div>

        {/* Description */}
        {notes && (
          <p className="font-sans font-light text-[15px] text-[#141414] leading-relaxed">
            {notes}
          </p>
        )}

        {/* Key info */}
        {(resource.url || resource.phone || resource.bizum || resource.address || resource.schedule || resource.free) && (
          <div className="divide-y divide-[rgba(20,20,20,0.08)] border-t border-[rgba(20,20,20,0.08)]">
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
            {locale === 'en' ? 'Call now' : 'Llamar ahora'} →
          </a>
        )}

        {/* Report — very low prominence */}
        <ReportForm countrySlug={resource.countrySlug} resourceId={resource.id} />
      </div>
    </main>
  )
}
