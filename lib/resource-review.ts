import { prisma } from '@/lib/prisma'
import type { Prisma } from '@prisma/client'

// Preserves the given id order so a frozen review-queue snapshot doesn't reshuffle mid-session.
export async function fetchResourcesByIds(ids: string[], where: Prisma.ResourceWhereInput = {}) {
  const rows = await prisma.resource.findMany({
    where: { id: { in: ids }, ...where },
    include: { city: true },
  })
  const byId = new Map(rows.map((r) => [r.id, r]))
  return ids.map((id) => byId.get(id)).filter((r): r is (typeof rows)[number] => r !== undefined)
}
