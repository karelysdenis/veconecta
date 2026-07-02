// Server-only DB-backed locale data. Kept out of lib/locale-content.ts
// because that file is also imported by client components ('use client'
// NameTabs/LanguageTabs/LangPopover) — pulling `prisma` in there would drag
// PrismaClient into the browser bundle.
import { cache } from 'react'
import { prisma } from '@/lib/prisma'
import { LOCALES, LOCALE_LABELS, type Locale } from '@/lib/locale-content'

export type ActiveLocale = { code: Locale; label: string }

export const getActiveLocales = cache(async (): Promise<ActiveLocale[]> => {
  const rows = await prisma.locale.findMany({
    where: { active: true },
    orderBy: { order: 'asc' },
  })
  return rows
    .filter((r): r is typeof r & { code: Locale } => (LOCALES as readonly string[]).includes(r.code))
    .map((r) => ({ code: r.code as Locale, label: LOCALE_LABELS[r.code as Locale] }))
})

export const getCountryLocaleMap = cache(async (): Promise<Record<string, string[]>> => {
  const countries = await prisma.country.findMany({
    select: { slug: true, enabledLocales: true },
  })
  return Object.fromEntries(countries.map((c) => [c.slug, c.enabledLocales]))
})
