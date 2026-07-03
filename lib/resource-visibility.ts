/** Prisma where clause fragment: excludes events whose eventEndsAt is in the past. Permanent resources (eventEndsAt always null) always pass. */
export function notPastEventFilter() {
  return {
    OR: [
      { eventEndsAt: null },
      { eventEndsAt: { gte: new Date() } },
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
