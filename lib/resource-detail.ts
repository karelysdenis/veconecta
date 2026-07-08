import type { ResourceKind } from '@prisma/client'

/** '/es/initiatives/slug' or '/es/events/slug': the one canonical URL for a resource, regardless of locale segment. */
export function resourceCanonicalPath(resource: { kind: ResourceKind; slug: string }, locale: string): string {
  const segment = resource.kind === 'EVENT' ? 'events' : 'initiatives'
  return `/${locale}/${segment}/${resource.slug}`
}
