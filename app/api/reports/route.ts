import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'

const schema = z.object({
  countrySlug: z.string().min(1),
  message: z.string().min(10).max(500),
  url: z.string().url().optional().or(z.literal('')),
  resourceId: z.string().optional(),
})

// In-memory rate limiter: max 3 reports per IP per 60 seconds
const ipTimestamps = new Map<string, number[]>()

function isRateLimited(ip: string): boolean {
  const now = Date.now()
  const windowMs = 60_000
  const maxRequests = 3

  const timestamps = (ipTimestamps.get(ip) ?? []).filter(t => now - t < windowMs)
  if (timestamps.length >= maxRequests) return true
  timestamps.push(now)
  ipTimestamps.set(ip, timestamps)
  return false
}

export async function POST(request: Request) {
  const ip = request.headers.get('x-forwarded-for') ?? 'unknown'

  if (isRateLimited(ip)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const body = await request.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid data' }, { status: 400 })
  }

  await prisma.communityReport.create({
    data: {
      countrySlug: parsed.data.countrySlug,
      message: parsed.data.message,
      url: parsed.data.url || null,
      resourceId: parsed.data.resourceId || null,
    },
  })

  return NextResponse.json({ ok: true })
}
