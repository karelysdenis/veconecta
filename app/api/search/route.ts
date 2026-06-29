import { prisma } from '@/lib/prisma'
import { ResourceStatus } from '@prisma/client'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const q = (searchParams.get('q')?.trim() ?? '').slice(0, 100)

  if (q.length < 2) return Response.json([])

  const results = await prisma.resource.findMany({
    where: {
      status: ResourceStatus.PUBLISHED,
      OR: [
        { name: { contains: q, mode: 'insensitive' } },
        { notesEs: { contains: q, mode: 'insensitive' } },
        { notesEn: { contains: q, mode: 'insensitive' } },
        { notesPt: { contains: q, mode: 'insensitive' } },
        { country: { nameEs: { contains: q, mode: 'insensitive' } } },
        { country: { nameEn: { contains: q, mode: 'insensitive' } } },
        { country: { namePt: { contains: q, mode: 'insensitive' } } },
      ],
    },
    select: {
      id: true,
      name: true,
      category: true,
      countrySlug: true,
      notesEs: true,
      notesEn: true,
      notesPt: true,
      country: {
        select: {
          nameEs: true,
          nameEn: true,
          namePt: true,
          flag: true,
          cca2: true,
        },
      },
    },
    orderBy: { createdAt: 'asc' },
    take: 100,
  })

  let fallback: typeof results = []
  if (results.length === 0) {
    fallback = await prisma.resource.findMany({
      where: { status: ResourceStatus.PUBLISHED, countrySlug: 'global' },
      select: {
        id: true,
        name: true,
        category: true,
        countrySlug: true,
        notesEs: true,
        notesEn: true,
        notesPt: true,
        country: {
          select: { nameEs: true, nameEn: true, namePt: true, flag: true, cca2: true },
        },
      },
      orderBy: { createdAt: 'asc' },
      take: 50,
    })
  }

  return Response.json({ results, fallback })
}
