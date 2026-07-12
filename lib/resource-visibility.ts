/**
 * Prisma where clause fragment: excludes events that have already happened.
 * Permanent resources (both event fields null) always pass. A single-day
 * event without `eventEndsAt` filled in (the common case: the admin form
 * treats start/end as two independent optional fields, see
 * `KindDateFields.tsx`) is judged by `eventStartsAt` instead of falling
 * through as "no end date = never expires".
 */
export function notPastEventFilter() {
  const now = new Date()
  return {
    OR: [
      { eventEndsAt: null, eventStartsAt: null },
      { eventEndsAt: { gte: now } },
      { eventEndsAt: null, eventStartsAt: { gte: now } },
    ],
  }
}

/**
 * Minimum genuinely city-scoped published resources before a city gets its
 * own promoted destination (shown in the country's city picker, indexable).
 * Below this, the country page's flat list already surfaces the city's
 * resources (with a city pill) — a dedicated page would mostly repeat the
 * same national/global resources as every other under-threshold city.
 */
export const MIN_CITY_RESOURCES = 5
