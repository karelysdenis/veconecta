import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { sendMagicLink } from '@/lib/resend'

const schema = z.object({ email: z.string().email() })

const COOLDOWN_MS = 60_000 // 1 request per email per minute

function generateToken(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Email inválido' }, { status: 400 })

  const { email } = parsed.data

  // Only registered users can receive magic links
  const user = await prisma.user.findUnique({ where: { email } })
  if (!user || !user.isActive) {
    // Silent 200 to avoid email enumeration
    return NextResponse.json({ ok: true })
  }

  // Rate limit: one request per email per minute (DB-based, works in serverless)
  const recentToken = await prisma.magicToken.findFirst({
    where: { email, createdAt: { gte: new Date(Date.now() - COOLDOWN_MS) } },
  })
  if (recentToken) {
    // Silent 200 to avoid revealing whether the email is registered
    return NextResponse.json({ ok: true })
  }

  // Invalidate old tokens and create a new one
  await prisma.magicToken.deleteMany({ where: { email } })

  const token = generateToken()
  await prisma.magicToken.create({
    data: {
      token,
      email,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 min
    },
  })

  if (process.env.NODE_ENV === 'development') {
    const url = `${process.env.NEXT_PUBLIC_URL ?? 'http://localhost:3000'}/api/auth/verify?token=${token}`
    console.log(`\n🔑 MAGIC LINK (dev)\n${url}\n`)
  }

  try {
    await sendMagicLink(email, token)
  } catch (err) {
    console.error('[magic-link] Resend error:', err)
    if (process.env.NODE_ENV !== 'development') {
      // Roll back: token is useless if the user never receives the email
      await prisma.magicToken.delete({ where: { token } })
    }
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ ok: true })
}
