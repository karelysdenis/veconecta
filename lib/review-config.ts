export const REVIEW_CYCLE_DAYS = 7
const ADVANCE_DAYS = 2

/** Date threshold: resources verified before this date need review */
export function reviewCutoff(): Date {
  return new Date(Date.now() - (REVIEW_CYCLE_DAYS - ADVANCE_DAYS) * 86400000)
}

/** Prisma where clause fragment: resources due for review */
export function dueForReviewFilter() {
  const cutoff = reviewCutoff()
  return {
    OR: [
      { verifiedAt: null },
      { verifiedAt: { lte: cutoff } },
    ],
  }
}
