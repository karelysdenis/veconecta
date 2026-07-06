import type { ResolvedCreate } from './types'

export function authorizeRowsForConfirm(
  rows: ResolvedCreate[],
  opts: {
    userRole: 'ADMIN' | 'EDITOR'
    editorCountrySlugs: string[]
    confirmedNewCountrySlugs: string[]
  },
): ResolvedCreate[] {
  return rows.filter((row) => {
    if (row.countryIsNew) {
      return opts.userRole === 'ADMIN' && opts.confirmedNewCountrySlugs.includes(row.countrySlug)
    }
    if (opts.userRole === 'EDITOR') {
      return opts.editorCountrySlugs.includes(row.countrySlug)
    }
    return true
  })
}
