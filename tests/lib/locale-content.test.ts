import { describe, expect, it } from 'vitest'
import { formatEventBadge } from '@/lib/locale-content'

describe('formatEventBadge', () => {
  it('formats day and abbreviated month in Spanish', () => {
    const result = formatEventBadge('2026-07-14T00:00:00.000Z', 'es')
    expect(result.day).toBe('14')
    expect(result.month.toLowerCase()).toContain('jul')
  })

  it('formats day and abbreviated month in English', () => {
    const result = formatEventBadge('2026-07-14T00:00:00.000Z', 'en')
    expect(result.day).toBe('14')
    expect(result.month.toLowerCase()).toContain('jul')
  })

  it('pads nothing for single-digit days (Intl gives unpadded numeric day)', () => {
    const result = formatEventBadge('2026-07-05T00:00:00.000Z', 'es')
    expect(result.day).toBe('5')
  })
})
