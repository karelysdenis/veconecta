import { describe, it, expect } from 'vitest'
import { urlHost } from '@/lib/format-url'

describe('urlHost', () => {
  it('returns the bare hostname without protocol or path', () => {
    expect(urlHost('https://gofundme.com/f/emergency-relief-for-venezuela-earthquake-victims')).toBe('gofundme.com')
  })

  it('strips a leading www.', () => {
    expect(urlHost('https://www.acnur.org/donar')).toBe('acnur.org')
  })

  it('falls back to a best-effort strip for an unparseable URL', () => {
    expect(urlHost('not-a-real-url/path')).toBe('not-a-real-url')
  })
})
