import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/lucia'
import { revalidatePath } from 'next/cache'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const { user } = await getSession()
  if (!user || user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const resource = await prisma.resource.findUnique({ where: { id } })
    if (!resource) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const now = new Date()
    const expiresAt = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000)

    await prisma.resource.update({
      where: { id },
      data: {
        status: 'PUBLISHED',
        verifiedAt: now,
        verifiedBy: user.email,
        expiresAt,
      },
    })

    // Revalidate public pages for this country in all locales
    revalidatePath(`/es/${resource.countrySlug}`)
    revalidatePath(`/en/${resource.countrySlug}`)
    revalidatePath(`/pt/${resource.countrySlug}`)

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[publish] DB error:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
