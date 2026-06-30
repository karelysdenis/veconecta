import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/lucia'
import { touchCountry } from '@/lib/audit'

const patchSchema = z.object({
  name: z.string().min(1).optional(),
  url: z.string().url().optional().or(z.literal('')),
  phone: z.string().optional(),
  bizum: z.string().optional(),
  free: z.boolean().optional(),
  notesEs: z.string().optional(),
  notesEn: z.string().optional(),
  notesPt: z.string().optional(),
})

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const { user } = await getSession()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => null)
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid data' }, { status: 400 })

  try {
    const resource = await prisma.resource.findUnique({ where: { id } })
    if (!resource) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    if (user.role === 'EDITOR' && !user.countrySlugs.includes(resource.countrySlug)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const updated = await prisma.resource.update({
      where: { id },
      data: { ...parsed.data, status: 'DRAFT', url: parsed.data.url || null },
    })
    return NextResponse.json(updated)
  } catch (err) {
    console.error('[resources PATCH] DB error:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const { user } = await getSession()
  if (!user || user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const archived = await prisma.resource.update({
      where: { id },
      data: { status: 'ARCHIVED' },
    })
    await touchCountry(archived.countrySlug)
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[resources DELETE] DB error:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
