import { searchResources } from '@/lib/search'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const q = (searchParams.get('q')?.trim() ?? '').slice(0, 100)
  const locale = searchParams.get('locale') ?? 'es'

  const { results, fallback, countries } = await searchResources({ query: q, locale })
  return Response.json({ results, fallback, countries })
}
