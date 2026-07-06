import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/prisma', () => ({
  prisma: {
    city: {
      create: vi.fn(),
      findUnique: vi.fn(),
    },
  },
}))

import { resolveOrCreateCityByName, resolveCityId } from '@/lib/city'
import { prisma } from '@/lib/prisma'

beforeEach(() => vi.clearAllMocks())

describe('resolveOrCreateCityByName', () => {
  it('creates a new city and returns its id', async () => {
    vi.mocked(prisma.city.create).mockResolvedValueOnce({ id: 'city1' } as never)
    const id = await resolveOrCreateCityByName('france', 'Nîmes')
    expect(id).toBe('city1')
    expect(prisma.city.create).toHaveBeenCalledWith({
      data: { countrySlug: 'france', slug: 'nimes', nameEs: 'Nîmes' },
    })
  })

  it('reuses the existing city on a slug collision (P2002)', async () => {
    vi.mocked(prisma.city.create).mockRejectedValueOnce({ code: 'P2002' })
    vi.mocked(prisma.city.findUnique).mockResolvedValueOnce({ id: 'existing-city' } as never)
    const id = await resolveOrCreateCityByName('france', 'Paris')
    expect(id).toBe('existing-city')
  })

  it('rethrows non-P2002 errors', async () => {
    vi.mocked(prisma.city.create).mockRejectedValueOnce(new Error('boom'))
    await expect(resolveOrCreateCityByName('france', 'Paris')).rejects.toThrow('boom')
  })
})

describe('resolveCityId (form)', () => {
  it('creates via resolveOrCreateCityByName when newCityName is present', async () => {
    vi.mocked(prisma.city.create).mockResolvedValueOnce({ id: 'city2' } as never)
    const fd = new FormData()
    fd.set('newCityName', 'Lyon')
    const id = await resolveCityId('france', fd)
    expect(id).toBe('city2')
  })

  it('returns cityId from the form when no newCityName', async () => {
    const fd = new FormData()
    fd.set('cityId', 'abc123')
    const id = await resolveCityId('france', fd)
    expect(id).toBe('abc123')
  })
})
