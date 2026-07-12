import { describe, expect, it } from 'vitest'
import { notPastEventFilter } from '@/lib/resource-visibility'

type EventFields = { eventStartsAt: Date | null; eventEndsAt: Date | null }

/** Evaluates the `{ OR: [...] }` fragment against a fake resource the same way Prisma would. */
function passesFilter(resource: EventFields): boolean {
  const { OR } = notPastEventFilter()
  return OR.some((clause) =>
    (Object.entries(clause) as [keyof EventFields, unknown][]).every(([field, condition]) => {
      const value = resource[field]
      if (condition === null) return value === null
      if (typeof condition === 'object' && condition !== null && 'gte' in condition) {
        return value !== null && value.getTime() >= (condition as { gte: Date }).gte.getTime()
      }
      return false
    }),
  )
}

const past = new Date(Date.now() - 24 * 60 * 60 * 1000)
const future = new Date(Date.now() + 24 * 60 * 60 * 1000)

describe('notPastEventFilter', () => {
  it('always passes a permanent resource (both event fields null)', () => {
    expect(passesFilter({ eventStartsAt: null, eventEndsAt: null })).toBe(true)
  })

  it('passes a multi-day event whose eventEndsAt is still in the future', () => {
    expect(passesFilter({ eventStartsAt: past, eventEndsAt: future })).toBe(true)
  })

  it('excludes a multi-day event whose eventEndsAt is in the past', () => {
    expect(passesFilter({ eventStartsAt: past, eventEndsAt: past })).toBe(false)
  })

  it('passes a single-day event with no eventEndsAt when eventStartsAt is in the future', () => {
    expect(passesFilter({ eventStartsAt: future, eventEndsAt: null })).toBe(true)
  })

  it('excludes a single-day event with no eventEndsAt once eventStartsAt is in the past (regression: used to pass forever)', () => {
    expect(passesFilter({ eventStartsAt: past, eventEndsAt: null })).toBe(false)
  })
})
