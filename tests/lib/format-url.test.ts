import { describe, it, expect } from 'vitest'
import { cleanUrlDisplay } from '@/lib/format-url'

describe('cleanUrlDisplay', () => {
  it('returns host + path, dropping the protocol', () => {
    expect(cleanUrlDisplay('https://gofundme.com/f/emergency-relief-for-venezuela')).toBe(
      'gofundme.com/f/emergency-relief-for-venezuela',
    )
  })

  it('strips a leading www.', () => {
    expect(cleanUrlDisplay('https://www.acnur.org/donar')).toBe('acnur.org/donar')
  })

  it('drops the path entirely when the URL points at the bare domain', () => {
    expect(cleanUrlDisplay('https://acnur.org')).toBe('acnur.org')
    expect(cleanUrlDisplay('https://acnur.org/')).toBe('acnur.org')
  })

  it('keeps the handle for a social media profile URL', () => {
    expect(cleanUrlDisplay('https://www.instagram.com/veconecta')).toBe('instagram.com/veconecta')
  })

  it('drops query string and hash (tracking params)', () => {
    expect(cleanUrlDisplay('https://acnur.org/donar?utm_source=fb&fbclid=abc#section')).toBe('acnur.org/donar')
  })

  it('truncates a long host+path to 60 characters with an ellipsis', () => {
    const longUrl = 'https://gofundme.com/f/emergency-relief-for-venezuela-earthquake-victims'
    const result = cleanUrlDisplay(longUrl)
    expect(result.length).toBe(58)
    expect(result.endsWith('…')).toBe(true)
  })

  it('falls back to a best-effort strip for an unparseable URL', () => {
    expect(cleanUrlDisplay('not-a-real-url/path')).toBe('not-a-real-url/path')
  })
})
