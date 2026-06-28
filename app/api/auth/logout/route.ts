// app/api/auth/logout/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { lucia, getSession } from '@/lib/lucia'
import { cookies } from 'next/headers'

export async function POST(req: NextRequest) {
  try {
    const { session } = await getSession()
    if (session) {
      await lucia.invalidateSession(session.id)
      const blank = lucia.createBlankSessionCookie()
      const cookieStore = await cookies()
      cookieStore.set(blank.name, blank.value, blank.attributes)
    }
  } catch (err) {
    console.error('[logout] DB error:', err)
  }
  return NextResponse.redirect(new URL('/admin/login', req.url))
}
