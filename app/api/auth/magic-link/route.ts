// app/api/auth/magic-link/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { sendMagicLink } from '@/lib/resend'

const schema = z.object({ email: z.string().email() })

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
    // Return 200 to avoid email enumeration
    return NextResponse.json({ ok: true })
  }

  // Invalidate old tokens for this email
  await prisma.magicToken.deleteMany({ where: { email } })

  const token = generateToken()
  await prisma.magicToken.create({
    data: {
      token,
      email,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 min
    },
  })

  try {
    await sendMagicLink(email, token)
  } catch (err) {
    console.error('[magic-link] Resend error (non-fatal):', err)
  }

  return NextResponse.json({ ok: true })
}
