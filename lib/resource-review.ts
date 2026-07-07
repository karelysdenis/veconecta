import { prisma } from '@/lib/prisma'
import type { Prisma } from '@prisma/client'
import { checkUrl, type LinkStatus } from '@/lib/link-check'

// Preserves the given id order so a frozen review-queue snapshot doesn't reshuffle mid-session.
export async function fetchResourcesByIds(ids: string[], where: Prisma.ResourceWhereInput = {}) {
  const rows = await prisma.resource.findMany({
    where: { id: { in: ids }, ...where },
    include: { city: true },
  })
  const byId = new Map(rows.map((r) => [r.id, r]))
  return ids.map((id) => byId.get(id)).filter((r): r is (typeof rows)[number] => r !== undefined)
}

export type WithLinkStatus<T> = T & { linkStatus: LinkStatus | 'none' }

/** Runs the live URL check in parallel for every resource that has one; resources without a url are "none". */
export async function annotateWithLinkStatus<T extends { url: string | null }>(
  resources: T[],
): Promise<WithLinkStatus<T>[]> {
  return Promise.all(
    resources.map(async (r) => ({
      ...r,
      linkStatus: r.url ? await checkUrl(r.url) : ('none' as const),
    })),
  )
}

/** Broken-link resources first; "unknown"/"none" are not treated as broken and keep their relative order. */
export function sortForReview<T extends { linkStatus: LinkStatus | 'none' }>(resources: T[]): T[] {
  const broken: T[] = []
  const rest: T[] = []
  for (const r of resources) {
    ;(r.linkStatus === 'broken' ? broken : rest).push(r)
  }
  return [...broken, ...rest]
}
