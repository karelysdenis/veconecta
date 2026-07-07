import type { ResolvedCreate } from './types'

export function authorizeRowsForConfirm(
  rows: ResolvedCreate[],
  opts: {
    userRole: 'ADMIN' | 'EDITOR'
    editorCountrySlugs: string[]
    confirmedNewCountrySlugs: string[]
    /** Slugs actually present in the submitted newCountries proposal — a row
     * confirmed by slug but absent here has nothing backing its country and
     * must be dropped, not just trusted on the checkbox value alone. */
    newCountrySlugs: string[]
  },
): ResolvedCreate[] {
  return rows.filter((row) => {
    if (row.countryIsNew) {
      return (
        opts.userRole === 'ADMIN' &&
        opts.newCountrySlugs.includes(row.countrySlug) &&
        opts.confirmedNewCountrySlugs.includes(row.countrySlug)
      )
    }
    if (opts.userRole === 'EDITOR') {
      return opts.editorCountrySlugs.includes(row.countrySlug)
    }
    return true
  })
}
