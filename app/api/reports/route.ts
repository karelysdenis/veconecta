import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { createHash } from 'crypto'

const schema = z.object({
  countrySlug: z.string().min(1),
  message: z.string().min(10).max(500),
  url: z.string().url().optional().or(z.literal('')),
  resourceId: z.string().optional(),
})

const WINDOW_MS = 60_000
const MAX_REQUESTS = 3

function hashIp(ip: string): string {
  return createHash('sha256').update(ip).digest('hex').slice(0, 16)
}

async function isRateLimited(ipHash: string): Promise<boolean> {
  const since = new Date(Date.now() - WINDOW_MS)
  const count = await prisma.communityReport.count({
    where: { ipHash, createdAt: { gte: since } },
  })
  return count >= MAX_REQUESTS
}

export async function POST(request: Request) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const ipHash = hashIp(ip)

  const body = await request.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid data' }, { status: 400 })
  }

  try {
    if (await isRateLimited(ipHash)) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }

    await prisma.communityReport.create({
      data: {
        countrySlug: parsed.data.countrySlug,
        message: parsed.data.message,
        url: parsed.data.url || null,
        resourceId: parsed.data.resourceId || null,
        ipHash,
      },
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[reports] DB error:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
