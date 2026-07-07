import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/link-check', () => ({
  checkUrl: vi.fn(),
}))

import { annotateWithLinkStatus, sortForReview } from '@/lib/resource-review'
import { checkUrl } from '@/lib/link-check'

beforeEach(() => vi.clearAllMocks())

describe('annotateWithLinkStatus', () => {
  it('checks the url and annotates linkStatus for resources that have one', async () => {
    vi.mocked(checkUrl).mockResolvedValueOnce('broken')
    const result = await annotateWithLinkStatus([{ id: '1', url: 'https://a.test' }])
    expect(result[0].linkStatus).toBe('broken')
    expect(checkUrl).toHaveBeenCalledWith('https://a.test')
  })

  it('marks resources without a url as "none" without calling checkUrl', async () => {
    const result = await annotateWithLinkStatus([{ id: '1', url: null }])
    expect(result[0].linkStatus).toBe('none')
    expect(checkUrl).not.toHaveBeenCalled()
  })
})

describe('sortForReview', () => {
  it('moves broken-link resources to the front, preserving relative order otherwise', () => {
    const input = [
      { id: 'a', linkStatus: 'ok' as const },
      { id: 'b', linkStatus: 'broken' as const },
      { id: 'c', linkStatus: 'unknown' as const },
      { id: 'd', linkStatus: 'broken' as const },
    ]
    expect(sortForReview(input).map((r) => r.id)).toEqual(['b', 'd', 'a', 'c'])
  })

  it('does not treat "unknown" or "none" as broken', () => {
    const input = [
      { id: 'a', linkStatus: 'unknown' as const },
      { id: 'b', linkStatus: 'none' as const },
    ]
    expect(sortForReview(input).map((r) => r.id)).toEqual(['a', 'b'])
  })
})
