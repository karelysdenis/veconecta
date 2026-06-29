import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/lucia'
import { ResourceCategory } from '@prisma/client'

const schema = z.object({
  countrySlug: z.string(),
  category: z.nativeEnum(ResourceCategory),
  name: z.string().min(1),
  url: z.string().url().optional().or(z.literal('')),
  phone: z.string().optional(),
  bizum: z.string().optional(),
  free: z.boolean().optional(),
  notesEs: z.string().optional(),
  notesEn: z.string().optional(),
  notesPt: z.string().optional(),
})

export async function POST(req: NextRequest) {
  const { user } = await getSession()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid data' }, { status: 400 })

  // EDITOR can only create resources for their country
  if (user.role === 'EDITOR' && !user.countrySlugs.includes(parsed.data.countrySlug)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const resource = await prisma.resource.create({
      data: { ...parsed.data, status: 'DRAFT', url: parsed.data.url || null },
    })
    return NextResponse.json(resource, { status: 201 })
  } catch (err) {
    console.error('[resources POST] DB error:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
