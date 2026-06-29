import { NextResponse } from 'next/server'

type ApiCountry = {
  name: { common: string }
  translations: { spa?: { common: string }; por?: { common: string } }
  flag: string
  cca2: string
}

let cached: ApiCountry[] | null = null

export async function GET() {
  if (cached) {
    return NextResponse.json(cached, {
      headers: { 'Cache-Control': 'public, max-age=86400' },
    })
  }

  try {
    const res = await fetch(
      'https://restcountries.com/v3.1/all?fields=name,translations,flag,cca2',
      { next: { revalidate: 86400 } }
    )
    if (!res.ok) throw new Error('upstream error')
    const data: ApiCountry[] = await res.json()
    cached = data
    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'public, max-age=86400' },
    })
  } catch {
    return NextResponse.json({ error: 'Failed to fetch countries' }, { status: 502 })
  }
}
