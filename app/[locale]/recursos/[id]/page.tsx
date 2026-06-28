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

const CATEGORY_COLORS: Record<ResourceCategory, string> = {
  FIND_FAMILY: 'bg-red-100 text-red-800',
  DONATE_MONEY: 'bg-pink-100 text-pink-800',
  SEND_MONEY: 'bg-blue-100 text-blue-800',
  CALL_FREE: 'bg-green-100 text-green-800',
  DONATE_PHYSICALLY: 'bg-orange-100 text-orange-800',
  DIGITAL_BRIDGE: 'bg-purple-100 text-purple-800',
  CONSULAR: 'bg-yellow-100 text-yellow-800',
  MENTAL_HEALTH: 'bg-teal-100 text-teal-800',
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

  // Build URL display (strip protocol for clean display)
  const urlDisplay = resource.url
    ? resource.url.replace(/^https?:\/\//, '').replace(/\/$/, '')
    : null

  const hasKeyInfo =
    resource.url ||
    resource.phone ||
    resource.bizum ||
    resource.address ||
    resource.schedule ||
    resource.free

  return (
    <main className="min-h-screen bg-white pb-8">
      {/* Breadcrumb */}
      <div className="bg-coco h-10 flex items-center px-5 gap-1.5 overflow-x-auto whitespace-nowrap">
        <Link
          href={`/${locale}`}
          className="font-sans font-normal text-sm text-caribe hover:underline shrink-0"
        >
          {tNav('home')}
        </Link>
        {countrySlug && (
          <>
            <span className="font-sans text-sm text-[#b8b8b8] shrink-0">›</span>
            <Link
              href={`/${locale}/${countrySlug}`}
              className="font-sans font-normal text-sm text-caribe hover:underline shrink-0"
            >
              {countryName}
            </Link>
          </>
        )}
        <span className="font-sans text-sm text-[#b8b8b8] shrink-0">›</span>
        <span className="font-sans font-normal text-sm text-[#141414] shrink-0">
          {categoryLabel}
        </span>
      </div>

      <div className="px-5 pt-5">
        {/* Category badge */}
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[13px] font-medium mb-4 ${CATEGORY_COLORS[resource.category]}`}
        >
          <span className="w-2 h-2 rounded-full bg-current opacity-70" />
          {categoryLabel}
        </span>

        {/* Resource name */}
        <h1 className="font-display font-extrabold text-[28px] leading-[1.1] tracking-[-0.01em] text-[#141414] mb-2">
          {resource.name}
        </h1>

        {/* Verified badge */}
        {verifiedDate && (
          <p className="font-sans text-sm text-[#2d7a4f] mb-4">
            ✓ {tDetail('verifiedBy')} · {verifiedDate}
          </p>
        )}

        {/* Description */}
        {notes && (
          <div className="bg-coco rounded-xl px-4 py-4 mb-6">
            <p className="font-sans font-light text-[15px] text-[#141414] leading-relaxed">
              {notes}
            </p>
          </div>
        )}

        {/* Key info */}
        {hasKeyInfo && (
          <div className="mb-6">
            <p className="font-sans font-semibold text-[11px] tracking-[0.08em] uppercase text-[#808080] mb-3">
              {tDetail('keyInfo')}
            </p>
            <div className="divide-y divide-[rgba(20,20,20,0.08)]">
              {resource.free && (
                <div className="py-3">
                  <p className="font-sans text-[11px] text-[#808080] uppercase tracking-wide mb-0.5">
                    {tDetail('free')}
                  </p>
                  <p className="font-sans font-semibold text-[15px] text-[#141414]">✓ Gratuito</p>
                </div>
              )}
              {resource.url && urlDisplay && (
                <div className="py-3">
                  <p className="font-sans text-[11px] text-[#808080] uppercase tracking-wide mb-0.5">
                    {tDetail('website')}
                  </p>
                  <a
                    href={resource.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-sans font-semibold text-[15px] text-caribe underline"
                  >
                    {urlDisplay}
                  </a>
                </div>
              )}
              {resource.bizum && (
                <div className="py-3">
                  <p className="font-sans text-[11px] text-[#808080] uppercase tracking-wide mb-0.5">
                    {tDetail('bizum')}
                  </p>
                  <p className="font-sans font-semibold text-[15px] text-[#141414]">
                    {resource.bizum}
                  </p>
                </div>
              )}
              {resource.phone && (
                <div className="py-3">
                  <p className="font-sans text-[11px] text-[#808080] uppercase tracking-wide mb-0.5">
                    {tDetail('phone')}
                  </p>
                  <a
                    href={`tel:${resource.phone.replace(/[^+\d]/g, '')}`}
                    className="font-sans font-semibold text-[15px] text-caribe"
                  >
                    {resource.phone}
                  </a>
                </div>
              )}
              {resource.address && (
                <div className="py-3">
                  <p className="font-sans text-[11px] text-[#808080] uppercase tracking-wide mb-0.5">
                    {tDetail('address')}
                  </p>
                  <p className="font-sans font-semibold text-[15px] text-[#141414]">
                    {resource.address}
                  </p>
                </div>
              )}
              {resource.schedule && (
                <div className="py-3">
                  <p className="font-sans text-[11px] text-[#808080] uppercase tracking-wide mb-0.5">
                    {tDetail('schedule')}
                  </p>
                  <p className="font-sans font-semibold text-[15px] text-[#141414]">
                    {resource.schedule}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Report link */}
        <div className="mb-6">
          <ReportForm countrySlug={resource.countrySlug} resourceId={resource.id} inline />
        </div>
      </div>

      {/* CTA — sticky bottom */}
      {resource.url && (
        <div className="px-5">
          <a
            href={resource.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full h-14 rounded-2xl bg-guacamaya text-white font-sans font-semibold text-base hover:bg-guacamaya/90 transition-colors"
          >
            {tDetail('goToResource')}
            <span className="text-lg">↗</span>
          </a>
        </div>
      )}
      {resource.phone && !resource.url && (
        <div className="px-5">
          <a
            href={`tel:${resource.phone.replace(/[^+\d]/g, '')}`}
            className="flex items-center justify-center gap-2 w-full h-14 rounded-2xl bg-guacamaya text-white font-sans font-semibold text-base hover:bg-guacamaya/90 transition-colors"
          >
            Llamar ahora
            <span className="text-lg">→</span>
          </a>
        </div>
      )}
    </main>
  )
}
