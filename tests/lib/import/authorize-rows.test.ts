import { describe, it, expect } from 'vitest'
import { authorizeRowsForConfirm } from '@/lib/import/authorize-rows'
import type { ResolvedCreate } from '@/lib/import/types'

function make(overrides: Partial<ResolvedCreate>): ResolvedCreate {
  return {
    rowNumber: 1,
    countrySlug: 'france',
    countryIsNew: false,
    category: 'DONATE_PHYSICALLY',
    name: 'Test',
    nameEn: null,
    namePt: null,
    nameFr: null,
    nameDe: null,
    url: null,
    phone: null,
    paymentKey: null,
    free: true,
    cityName: null,
    cityIsNew: false,
    address: null,
    schedule: null,
    notesEs: null,
    notesEn: null,
    notesPt: null,
    notesFr: null,
    notesDe: null,
    validUntil: null,
    ...overrides,
  } as ResolvedCreate
}

describe('authorizeRowsForConfirm', () => {
  it('keeps an ordinary row for ADMIN', () => {
    const result = authorizeRowsForConfirm([make({})], {
      userRole: 'ADMIN',
      editorCountrySlugs: [],
      confirmedNewCountrySlugs: [],
      newCountrySlugs: [],
    })
    expect(result).toHaveLength(1)
  })

  it('keeps a new-country row for ADMIN only if the country slug was confirmed and proposed', () => {
    const rows = [make({ countryIsNew: true, countrySlug: 'nueva-nacion' })]
    const notConfirmed = authorizeRowsForConfirm(rows, {
      userRole: 'ADMIN',
      editorCountrySlugs: [],
      confirmedNewCountrySlugs: [],
      newCountrySlugs: ['nueva-nacion'],
    })
    const confirmed = authorizeRowsForConfirm(rows, {
      userRole: 'ADMIN',
      editorCountrySlugs: [],
      confirmedNewCountrySlugs: ['nueva-nacion'],
      newCountrySlugs: ['nueva-nacion'],
    })
    expect(notConfirmed).toHaveLength(0)
    expect(confirmed).toHaveLength(1)
  })

  it('drops a new-country row confirmed by slug but absent from the proposed newCountrySlugs (desynced/tampered hidden inputs)', () => {
    const rows = [make({ countryIsNew: true, countrySlug: 'nueva-nacion' })]
    const result = authorizeRowsForConfirm(rows, {
      userRole: 'ADMIN',
      editorCountrySlugs: [],
      confirmedNewCountrySlugs: ['nueva-nacion'],
      newCountrySlugs: [], // the country that would actually be created is empty — nothing backs this slug
    })
    expect(result).toHaveLength(0)
  })

  it('drops new-country rows for EDITOR even if marked confirmed (tampered input)', () => {
    const rows = [make({ countryIsNew: true, countrySlug: 'nueva-nacion' })]
    const result = authorizeRowsForConfirm(rows, {
      userRole: 'EDITOR',
      editorCountrySlugs: [],
      confirmedNewCountrySlugs: ['nueva-nacion'],
      newCountrySlugs: ['nueva-nacion'],
    })
    expect(result).toHaveLength(0)
  })

  it('drops rows for EDITOR outside their assigned countries (tampered input)', () => {
    const rows = [make({ countrySlug: 'spain' })]
    const result = authorizeRowsForConfirm(rows, {
      userRole: 'EDITOR',
      editorCountrySlugs: ['france'],
      confirmedNewCountrySlugs: [],
      newCountrySlugs: [],
    })
    expect(result).toHaveLength(0)
  })

  it('keeps rows for EDITOR within their assigned countries', () => {
    const rows = [make({ countrySlug: 'france' })]
    const result = authorizeRowsForConfirm(rows, {
      userRole: 'EDITOR',
      editorCountrySlugs: ['france'],
      confirmedNewCountrySlugs: [],
      newCountrySlugs: [],
    })
    expect(result).toHaveLength(1)
  })
})
