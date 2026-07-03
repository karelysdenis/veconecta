/** Prisma where clause fragment: excludes events whose eventEndsAt is in the past. Permanent resources (eventEndsAt always null) always pass. */
export function notPastEventFilter() {
  return {
    OR: [
      { eventEndsAt: null },
      { eventEndsAt: { gte: new Date() } },
    ],
  }
}
