import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// DELETE THIS FILE IMMEDIATELY AFTER USE
export async function GET() {
  const email = 'karels@reakagency.com'

  const user = await prisma.user.upsert({
    where: { email },
    update: { role: 'ADMIN', isActive: true },
    create: { email, role: 'ADMIN', isActive: true },
  })

  return NextResponse.json({ ok: true, email: user.email, role: user.role })
}
