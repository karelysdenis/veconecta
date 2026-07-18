import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { createHash } from 'crypto'

// z.string().url() alone accepts any syntactically valid URL, including
// javascript: — restrict to http/https since this gets rendered as a
// clickable <a href> in the admin dashboard.
const httpUrl = z.string().url().refine(
  (v) => /^https?:\/\//i.test(v),
  { message: 'Only http/https URLs are allowed' },
)

const schema = z.object({
  countrySlug: z.string().min(1).max(100),
  message: z.string().min(10).max(500),
  url: httpUrl.optional().or(z.literal('')),
  resourceId: z.string().optional(),
})

const WINDOW_MS = 60_000
const MAX_REQUESTS = 3
// Shared by the footer's "suggest an initiative/event" CTA (high-visibility,
// on every page) and the older "report outdated info" link (low-visibility,
// buried on resource detail pages) — sized generously so the newer, more
// prominent CTA can't starve the older feature's daily budget.
const DAILY_GLOBAL_LIMIT = 2000
const DAILY_WINDOW_MS = 24 * 60 * 60 * 1000

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

async function isGlobalLimitReached(): Promise<boolean> {
  const since = new Date(Date.now() - DAILY_WINDOW_MS)
  const count = await prisma.communityReport.count({
    where: { createdAt: { gte: since } },
  })
  return count >= DAILY_GLOBAL_LIMIT
}

export async function POST(request: Request) {
  // The first entry in x-forwarded-for is whatever the client claims and is
  // trivially spoofable. The last entry is appended by our own trusted proxy
  // (Vercel's edge) with the real connecting IP, so use that one instead.
  const forwardedFor = request.headers.get('x-forwarded-for')
  const ip = forwardedFor?.split(',').map((s) => s.trim()).filter(Boolean).pop() ?? 'unknown'
  const ipHash = hashIp(ip)

  const body = await request.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid data' }, { status: 400 })
  }

  try {
    if (await isGlobalLimitReached()) {
      return NextResponse.json({ error: 'Service temporarily unavailable' }, { status: 429 })
    }

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
