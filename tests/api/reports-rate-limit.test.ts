import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/prisma', () => ({
  prisma: {
    communityReport: {
      count: vi.fn(),
      create: vi.fn().mockResolvedValue({}),
    },
  },
}))

import { POST } from '@/app/api/reports/route'
import { prisma } from '@/lib/prisma'

function makeRequest(body: object) {
  return new Request('http://localhost/api/reports', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '1.2.3.4' },
    body: JSON.stringify(body),
  })
}

beforeEach(() => vi.clearAllMocks())

describe('reports rate limit', () => {
  it('rechaza si se supera el límite global diario (500 reportes/24h)', async () => {
    vi.mocked(prisma.communityReport.count).mockResolvedValueOnce(500)
    const res = await POST(makeRequest({ countrySlug: 'spain', message: 'test message largo aquí' }))
    expect(res.status).toBe(429)
  })

  it('rechaza cuando hay 3 o más reports del mismo IP en el último minuto', async () => {
    vi.mocked(prisma.communityReport.count)
      .mockResolvedValueOnce(0)  // global limit: OK
      .mockResolvedValueOnce(3)  // per-IP limit: exceeded
    const res = await POST(makeRequest({ countrySlug: 'spain', message: 'test message largo aquí' }))
    expect(res.status).toBe(429)
  })

  it('acepta cuando los límites no se han superado', async () => {
    vi.mocked(prisma.communityReport.count)
      .mockResolvedValueOnce(0)  // global limit: OK
      .mockResolvedValueOnce(2)  // per-IP limit: OK
    const res = await POST(makeRequest({ countrySlug: 'spain', message: 'test message largo aquí' }))
    expect(res.status).toBe(200)
  })

  it('rechaza body con message demasiado corto (< 10 chars)', async () => {
    vi.mocked(prisma.communityReport.count).mockResolvedValueOnce(0)
    const res = await POST(makeRequest({ countrySlug: 'spain', message: 'corto' }))
    expect(res.status).toBe(400)
  })

  it('rechaza body sin countrySlug', async () => {
    vi.mocked(prisma.communityReport.count).mockResolvedValueOnce(0)
    const res = await POST(makeRequest({ message: 'test message largo aquí' }))
    expect(res.status).toBe(400)
  })
})
