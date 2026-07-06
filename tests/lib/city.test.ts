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
  it('creates a new city and returns its id when none exists yet', async () => {
    vi.mocked(prisma.city.findUnique).mockResolvedValueOnce(null)
    vi.mocked(prisma.city.create).mockResolvedValueOnce({ id: 'city1' } as never)
    const id = await resolveOrCreateCityByName('france', 'Nîmes')
    expect(id).toBe('city1')
    expect(prisma.city.create).toHaveBeenCalledWith({
      data: { countrySlug: 'france', slug: 'nimes', nameEs: 'Nîmes' },
    })
  })

  it('returns the existing city id from the pre-check without attempting create', async () => {
    vi.mocked(prisma.city.findUnique).mockResolvedValueOnce({ id: 'already-there' } as never)
    const id = await resolveOrCreateCityByName('france', 'Paris')
    expect(id).toBe('already-there')
    expect(prisma.city.create).not.toHaveBeenCalled()
  })

  it('reuses the existing city on a slug collision (P2002) — belt-and-suspenders for a race the pre-check missed', async () => {
    vi.mocked(prisma.city.findUnique)
      .mockResolvedValueOnce(null) // pre-check: not found yet
      .mockResolvedValueOnce({ id: 'existing-city' } as never) // after P2002: found
    vi.mocked(prisma.city.create).mockRejectedValueOnce({ code: 'P2002' })
    const id = await resolveOrCreateCityByName('france', 'Paris')
    expect(id).toBe('existing-city')
    expect(prisma.city.create).toHaveBeenCalled()
  })

  it('rethrows non-P2002 errors', async () => {
    vi.mocked(prisma.city.findUnique).mockResolvedValueOnce(null)
    vi.mocked(prisma.city.create).mockRejectedValueOnce(new Error('boom'))
    await expect(resolveOrCreateCityByName('france', 'Paris')).rejects.toThrow('boom')
  })

  it('uses an explicit client (e.g. a transaction) instead of the default prisma import when given one', async () => {
    const tx = {
      city: {
        create: vi.fn().mockResolvedValueOnce({ id: 'tx-city' }),
        findUnique: vi.fn().mockResolvedValueOnce(null),
      },
    }
    const id = await resolveOrCreateCityByName('france', 'Lyon', tx as never)
    expect(id).toBe('tx-city')
    expect(tx.city.create).toHaveBeenCalledWith({ data: { countrySlug: 'france', slug: 'lyon', nameEs: 'Lyon' } })
    expect(prisma.city.create).not.toHaveBeenCalled()
  })
})

describe('resolveCityId (form)', () => {
  it('creates via resolveOrCreateCityByName when newCityName is present', async () => {
    vi.mocked(prisma.city.findUnique).mockResolvedValueOnce(null)
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
