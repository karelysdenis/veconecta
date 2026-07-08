import { describe, it, expect, vi, afterEach } from 'vitest'
import { checkUrl } from '@/lib/link-check'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('checkUrl', () => {
  it('returns "ok" for a 200 response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 200 }))
    expect(await checkUrl('https://example.com')).toBe('ok')
  })

  it('returns "broken" for a 404 response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 404 }))
    expect(await checkUrl('https://example.com/missing')).toBe('broken')
  })

  it('falls back to GET when HEAD returns 405, and uses that result', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 405 })
      .mockResolvedValueOnce({ ok: true, status: 200 })
    vi.stubGlobal('fetch', fetchMock)

    expect(await checkUrl('https://example.com')).toBe('ok')
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ method: 'HEAD' })
    expect(fetchMock.mock.calls[1][1]).toMatchObject({ method: 'GET' })
  })

  it('falls back to GET when HEAD returns 403 (bot-protection blocking HEAD), and uses that result', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 403 })
      .mockResolvedValueOnce({ ok: true, status: 200 })
    vi.stubGlobal('fetch', fetchMock)

    expect(await checkUrl('https://example.com')).toBe('ok')
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(fetchMock.mock.calls[1][1]).toMatchObject({ method: 'GET' })
  })

  it('returns "broken" when both HEAD and the GET fallback fail', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 404 })
    vi.stubGlobal('fetch', fetchMock)

    expect(await checkUrl('https://example.com/missing')).toBe('broken')
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('returns "unknown" (not "broken") when both HEAD and GET are blocked with 403 — bot-protection, not proof the content is gone', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 403 })
    vi.stubGlobal('fetch', fetchMock)

    expect(await checkUrl('https://example.com/protected')).toBe('unknown')
  })

  it('returns "unknown" (not "broken") when both HEAD and GET are rate-limited with 429', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 429 })
    vi.stubGlobal('fetch', fetchMock)

    expect(await checkUrl('https://example.com/rate-limited')).toBe('unknown')
  })

  it('returns "unknown" when fetch aborts (timeout)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new DOMException('Aborted', 'AbortError')))
    expect(await checkUrl('https://example.com', 10)).toBe('unknown')
  })

  it('returns "unknown" on a generic network error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('fetch failed')))
    expect(await checkUrl('https://example.com')).toBe('unknown')
  })
})
