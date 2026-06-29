// lib/lucia.ts
import { Lucia } from 'lucia'
import { PrismaAdapter } from '@lucia-auth/adapter-prisma'
import { prisma } from './prisma'
import { cookies } from 'next/headers'
import { cache } from 'react'

const adapter = new PrismaAdapter(prisma.session, prisma.user)

export const lucia = new Lucia(adapter, {
  sessionCookie: {
    attributes: {
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    },
  },
  getUserAttributes: (attributes) => ({
    email: attributes.email,
    role: attributes.role,
    countrySlugs: attributes.countrySlugs,
    isActive: attributes.isActive,
  }),
})

declare module 'lucia' {
  interface Register {
    Lucia: typeof lucia
    DatabaseUserAttributes: {
      email: string
      role: 'ADMIN' | 'EDITOR'
      countrySlugs: string[]
      isActive: boolean
    }
  }
}

export const getSession = cache(async () => {
  const cookieStore = await cookies()
  const sessionId = cookieStore.get(lucia.sessionCookieName)?.value ?? null
  if (!sessionId) return { user: null, session: null }

  const result = await lucia.validateSession(sessionId)

  try {
    if (result.session?.fresh) {
      const cookie = lucia.createSessionCookie(result.session.id)
      cookieStore.set(cookie.name, cookie.value, cookie.attributes)
    }
    if (!result.session) {
      const cookie = lucia.createBlankSessionCookie()
      cookieStore.set(cookie.name, cookie.value, cookie.attributes)
    }
  } catch {}

  return result
})
