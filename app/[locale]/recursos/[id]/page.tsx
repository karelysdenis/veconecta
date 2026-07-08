import { notFound, redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { ResourceStatus } from '@prisma/client'
import { resourceCanonicalPath } from '@/lib/resource-detail'

/**
 * Legacy URL, kept working forever: links already shared on WhatsApp/social
 * during the active emergency must not 404 just because the URL scheme
 * changed to /initiatives/[slug] and /events/[slug].
 */
export default async function LegacyResourceRedirect({
  params,
}: {
  params: Promise<{ locale: string; id: string }>
}) {
  const { locale, id } = await params
  const resource = await prisma.resource.findUnique({
    where: { id, status: ResourceStatus.PUBLISHED },
    select: { slug: true, kind: true },
  })
  if (!resource) notFound()
  redirect(resourceCanonicalPath(resource, locale))
}
