import { describe, it, expect } from 'vitest'
import { isToday } from '@/components/admin/resource-review-constants'

describe('isToday', () => {
  it('returns true for a date that falls on today (year/month/day)', () => {
    expect(isToday(new Date())).toBe(true)
  })

  it('returns false for a date from yesterday', () => {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    expect(isToday(yesterday)).toBe(false)
  })

  it('returns false for a date from a different year', () => {
    const lastYear = new Date()
    lastYear.setFullYear(lastYear.getFullYear() - 1)
    expect(isToday(lastYear)).toBe(false)
  })
})
