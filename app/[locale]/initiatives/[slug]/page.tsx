import { notFound, redirect } from 'next/navigation'
import { setRequestLocale } from 'next-intl/server'
import { ResourceDetailView } from '@/components/ResourceDetailView'
import { fetchPublishedResourceBySlug, buildResourceMetadata } from '@/lib/resource-metadata'
import { resourceCanonicalPath } from '@/lib/resource-detail'
import type { Metadata } from 'next'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>
}): Promise<Metadata> {
  const { locale, slug } = await params
  const resource = await fetchPublishedResourceBySlug(slug)
  if (!resource) return {}
  return buildResourceMetadata(resource, locale)
}

export default async function InitiativeDetailPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>
}) {
  const { locale, slug } = await params
  setRequestLocale(locale)

  const resource = await fetchPublishedResourceBySlug(slug)
  if (!resource) notFound()
  if (resource.kind === 'EVENT') redirect(resourceCanonicalPath(resource, locale))

  return <ResourceDetailView resource={resource} locale={locale} />
}
