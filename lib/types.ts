// Serialized version of Prisma's Resource type safe for Server → Client props.
// Next.js cannot serialize Date objects across the boundary; use this type
// whenever resources are passed to 'use client' components.
import type { City, Resource } from '@prisma/client'
import { localizeBare } from './locale-content'

export type SerializedCity = Pick<City, 'slug' | 'nameEs' | 'nameEn' | 'namePt' | 'nameFr' | 'nameDe'>

export type SerializedResource = Omit<
  Resource,
  'verifiedAt' | 'validUntil' | 'createdAt' | 'updatedAt'
> & {
  verifiedAt: string | null
  validUntil: string | null
  createdAt: string
  updatedAt: string
  city: SerializedCity | null
}

export function getResourceName(resource: { name: string }, locale: string): string {
  return localizeBare(resource, 'name', locale)
}

export function serializeResource(r: Resource & { city?: City | null }): SerializedResource {
  return {
    ...r,
    verifiedAt: r.verifiedAt?.toISOString() ?? null,
    validUntil: r.validUntil?.toISOString() ?? null,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
    city: r.city ?? null,
  }
}
