import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

const COOKIE_NAME = 'review_view'
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365

export type ReviewViewMode = 'list' | 'one'

/** Reads the user's last-picked review queue view mode; defaults to 'one' (today's behavior). */
export async function getReviewViewMode(): Promise<ReviewViewMode> {
  const store = await cookies()
  return store.get(COOKIE_NAME)?.value === 'list' ? 'list' : 'one'
}

/** Server action: persists the chosen view mode site-wide and redirects back to the review queue. */
export async function setReviewViewMode(formData: FormData) {
  'use server'
  const mode: ReviewViewMode = formData.get('mode') === 'list' ? 'list' : 'one'
  const rawReturnTo = formData.get('returnTo')
  const returnTo =
    typeof rawReturnTo === 'string' && rawReturnTo.startsWith('/admin/') && !rawReturnTo.startsWith('//')
      ? rawReturnTo
      : '/admin'

  const store = await cookies()
  store.set(COOKIE_NAME, mode, { path: '/', maxAge: ONE_YEAR_SECONDS })
  redirect(returnTo)
}
