import { describe, it, expect } from 'vitest'
import { resourceCanonicalPath } from '@/lib/resource-detail'

describe('resourceCanonicalPath', () => {
  it('builds an /initiatives/ path for a non-event resource', () => {
    expect(resourceCanonicalPath({ kind: 'PERMANENT', slug: 'acnur-espana' }, 'es')).toBe(
      '/es/initiatives/acnur-espana',
    )
  })

  it('builds an /events/ path for an EVENT resource', () => {
    expect(resourceCanonicalPath({ kind: 'EVENT', slug: 'jornada-donacion-madrid' }, 'es')).toBe(
      '/es/events/jornada-donacion-madrid',
    )
  })

  it('uses the given locale segment regardless of resource content', () => {
    expect(resourceCanonicalPath({ kind: 'PERMANENT', slug: 'acnur-espana' }, 'en')).toBe(
      '/en/initiatives/acnur-espana',
    )
  })
})
