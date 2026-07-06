import { describe, it, expect } from 'vitest'
import { resolveRows } from '@/lib/import/resolve-rows'
import type { TrackerRow } from '@/lib/import/types'

const COUNTRIES = [
  { slug: 'france', nameEs: 'Francia' },
  { slug: 'spain', nameEs: 'España' },
]

function row(overrides: Partial<TrackerRow>): TrackerRow {
  return {
    rowNumber: 1,
    country: 'Francia',
    category: 'DONATE_PHYSICALLY',
    name: 'Test',
    nameEn: null,
    namePt: null,
    nameFr: null,
    nameDe: null,
    url: null,
    phoneRaw: null,
    free: 'Sí',
    city: null,
    address: null,
    schedule: null,
    notesEs: null,
    notesEn: null,
    notesPt: null,
    notesFr: null,
    notesDe: null,
    validUntil: null,
    priority: null,
    internalNotes: null,
    ...overrides,
  }
}

const baseCtx = {
  countries: COUNTRIES,
  existingResourceNames: new Map<string, Set<string>>(),
  existingCityNames: new Map<string, Set<string>>(),
  userRole: 'ADMIN' as const,
  editorCountrySlugs: [] as string[],
}

describe('resolveRows', () => {
  it('resolves a valid row into toCreate', () => {
    const result = resolveRows([row({})], baseCtx)
    expect(result.toCreate).toHaveLength(1)
    expect(result.toCreate[0].countrySlug).toBe('france')
    expect(result.toCreate[0].free).toBe(true)
  })

  it('flags rows with an empty name as errors', () => {
    const result = resolveRows([row({ name: '  ' })], baseCtx)
    expect(result.errors).toHaveLength(1)
    expect(result.toCreate).toHaveLength(0)
  })

  it('flags rows with an unrecognized category as errors', () => {
    const result = resolveRows([row({ category: 'NOT_A_CATEGORY' })], baseCtx)
    expect(result.errors[0].reason).toContain('Categoría no reconocida')
  })

  it('proposes a new country for ADMIN when the country is unresolved', () => {
    const result = resolveRows([row({ country: 'Nueva Nación' })], baseCtx)
    expect(result.newCountries).toHaveLength(1)
    expect(result.newCountries[0].slug).toBe('nueva-nacion')
    expect(result.toCreate[0].countryIsNew).toBe(true)
  })

  it('marks unresolved-country rows out of scope for EDITOR', () => {
    const ctx = { ...baseCtx, userRole: 'EDITOR' as const, editorCountrySlugs: ['france'] }
    const result = resolveRows([row({ country: 'Nueva Nación' })], ctx)
    expect(result.outOfScope).toHaveLength(1)
    expect(result.toCreate).toHaveLength(0)
  })

  it('marks a resolved country outside editorCountrySlugs as out of scope', () => {
    const ctx = { ...baseCtx, userRole: 'EDITOR' as const, editorCountrySlugs: ['spain'] }
    const result = resolveRows([row({ country: 'Francia' })], ctx)
    expect(result.outOfScope).toHaveLength(1)
  })

  it('skips rows that duplicate an existing resource name in the same country', () => {
    const ctx = { ...baseCtx, existingResourceNames: new Map([['france', new Set(['Test'])]]) }
    const result = resolveRows([row({})], ctx)
    expect(result.duplicates).toHaveLength(1)
    expect(result.toCreate).toHaveLength(0)
  })

  it('allows two rows with the same name in the same country when neither exists yet (same org, different cities)', () => {
    const result = resolveRows([row({ city: 'Nîmes' }), row({ city: 'Montpellier' })], baseCtx)
    expect(result.toCreate).toHaveLength(2)
  })

  it('marks a city as new when it does not match existingCityNames', () => {
    const ctx = { ...baseCtx, existingCityNames: new Map([['france', new Set(['paris'])]]) }
    const result = resolveRows([row({ city: 'Nîmes' })], ctx)
    expect(result.toCreate[0].cityIsNew).toBe(true)
  })

  it('marks a city as not new when it matches existingCityNames case-insensitively', () => {
    const ctx = { ...baseCtx, existingCityNames: new Map([['france', new Set(['paris'])]]) }
    const result = resolveRows([row({ city: 'PARIS' })], ctx)
    expect(result.toCreate[0].cityIsNew).toBe(false)
  })

  it('marks a city as not new when it matches an existing city that differs only by accents (same DB-level slug)', () => {
    const ctx = { ...baseCtx, existingCityNames: new Map([['france', new Set(['nimes'])]]) }
    const result = resolveRows([row({ city: 'Nîmes' })], ctx)
    expect(result.toCreate[0].cityIsNew).toBe(false)
  })

  it('counts rows with internal notes or priority for the non-blocking warning, regardless of outcome', () => {
    const result = resolveRows(
      [row({ internalNotes: 'verificar antes de publicar' }), row({ priority: 'alta', name: 'Otro' })],
      baseCtx,
    )
    expect(result.internalNotesWarningCount).toBe(2)
  })
})
