import { NextResponse } from 'next/server'
import countries from 'world-countries'

export const dynamic = 'force-static'

const data = countries.map(c => ({
  name: { common: c.name.common },
  translations: {
    spa: c.translations.spa ? { common: c.translations.spa.common } : undefined,
    por: c.translations.por ? { common: c.translations.por.common } : undefined,
    fra: c.translations.fra ? { common: c.translations.fra.common } : undefined,
    deu: c.translations.deu ? { common: c.translations.deu.common } : undefined,
  },
  flag: c.flag,
  cca2: c.cca2,
}))

export function GET() {
  return NextResponse.json(data, {
    headers: { 'Cache-Control': 'public, max-age=86400' },
  })
}
