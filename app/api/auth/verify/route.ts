// app/api/auth/verify/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { lucia } from '@/lib/lucia'
import { cookies } from 'next/headers'

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')
  if (!token) return NextResponse.redirect(new URL('/admin/login?error=invalid', req.url))

  try {
    const magicToken = await prisma.magicToken.findUnique({ where: { token } })

    if (!magicToken || magicToken.expiresAt < new Date()) {
      await prisma.magicToken.deleteMany({ where: { token } })
      return NextResponse.redirect(new URL('/admin/login?error=expired', req.url))
    }

    const user = await prisma.user.findUnique({ where: { email: magicToken.email } })
    if (!user || !user.isActive) {
      return NextResponse.redirect(new URL('/admin/login?error=invalid', req.url))
    }

    await prisma.magicToken.delete({ where: { token } })

    const session = await lucia.createSession(user.id, {})
    const sessionCookie = lucia.createSessionCookie(session.id)
    const cookieStore = await cookies()
    cookieStore.set(sessionCookie.name, sessionCookie.value, sessionCookie.attributes)

    return NextResponse.redirect(new URL('/admin', req.url))
  } catch (err) {
    console.error('[verify] DB error:', err)
    return NextResponse.redirect(new URL('/admin/login?error=server', req.url))
  }
}
