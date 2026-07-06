import { describe, it, expect } from 'vitest'
import { resolveCountrySlug } from '@/lib/import/country-aliases'

const COUNTRIES = [
  { slug: 'france', nameEs: 'Francia' },
  { slug: 'spain', nameEs: 'España' },
  { slug: 'usa', nameEs: 'Estados Unidos' },
  { slug: 'mexico', nameEs: 'México' },
  { slug: 'peru', nameEs: 'Perú' },
]

describe('resolveCountrySlug', () => {
  it('matches Country.nameEs case-insensitively', () => {
    expect(resolveCountrySlug('francia', COUNTRIES)).toBe('france')
    expect(resolveCountrySlug('FRANCIA', COUNTRIES)).toBe('france')
  })

  it('matches accent-insensitively', () => {
    expect(resolveCountrySlug('Mexico', COUNTRIES)).toBe('mexico')
    expect(resolveCountrySlug('Peru', COUNTRIES)).toBe('peru')
  })

  it('resolves via the alias map for abbreviations/foreign spellings', () => {
    expect(resolveCountrySlug('EEUU', COUNTRIES)).toBe('usa')
    expect(resolveCountrySlug('United States', COUNTRIES)).toBe('usa')
  })

  it('returns null when nothing matches', () => {
    expect(resolveCountrySlug('Narnia', COUNTRIES)).toBeNull()
  })

  it('trims surrounding whitespace before matching', () => {
    expect(resolveCountrySlug('  Francia  ', COUNTRIES)).toBe('france')
  })
})
