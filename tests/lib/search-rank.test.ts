import { describe, it, expect } from 'vitest'
import { rankSearchResults } from '@/lib/search-rank'

const base = {
  name: '',
  nameEn: null,
  namePt: null,
  nameFr: null,
  nameDe: null,
  notesEs: null,
  notesEn: null,
  notesPt: null,
  notesFr: null,
  notesDe: null,
}

describe('rankSearchResults', () => {
  it('ranks a name that starts with the query above one that only contains it', () => {
    const a = { ...base, id: 'a', name: 'Fundación Ayuda Venezuela' }
    const b = { ...base, id: 'b', name: 'Ayuda Venezuela Fundación' }
    const result = rankSearchResults([a, b], 'ayuda', 'es')
    expect(result.map((r) => r.id)).toEqual(['b', 'a'])
  })

  it('ranks a name match above a notes match', () => {
    const a = { ...base, id: 'a', name: 'ONG X', notesEs: 'campaña gofundme activa' }
    const b = { ...base, id: 'b', name: 'gofundme campaign' }
    const result = rankSearchResults([a, b], 'gofundme', 'es')
    expect(result.map((r) => r.id)).toEqual(['b', 'a'])
  })

  it("prioritizes a match in the visitor's locale over a match only visible in another locale", () => {
    const a = { ...base, id: 'a', name: 'X', nameFr: 'Fondation Venezuela' }
    const b = { ...base, id: 'b', name: 'Fundación Venezuela' }
    const result = rankSearchResults([a, b], 'venezuela', 'es')
    expect(result.map((r) => r.id)).toEqual(['b', 'a'])
  })

  it('still surfaces a match that only exists in a non-visitor locale column, below locale matches', () => {
    const a = { ...base, id: 'a', name: 'X', nameEn: 'GoFundMe Relief' }
    const result = rankSearchResults([a], 'gofundme', 'es')
    expect(result.map((r) => r.id)).toEqual(['a'])
  })

  it('preserves the original relative order for resources in the same tier', () => {
    const a = { ...base, id: 'a', name: 'ONG Alpha' }
    const b = { ...base, id: 'b', name: 'ONG Beta' }
    const result = rankSearchResults([a, b], 'ong', 'es')
    expect(result.map((r) => r.id)).toEqual(['a', 'b'])
  })
})
