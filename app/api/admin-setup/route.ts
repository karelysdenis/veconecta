import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// One-time route — delete after use
export async function POST(req: NextRequest) {
  const { email, secret } = await req.json()

  if (secret !== process.env.ADMIN_SETUP_SECRET) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const user = await prisma.user.upsert({
    where: { email },
    update: { role: 'ADMIN', isActive: true },
    create: { email, role: 'ADMIN', isActive: true },
  })

  return NextResponse.json({ ok: true, email: user.email, role: user.role })
}
