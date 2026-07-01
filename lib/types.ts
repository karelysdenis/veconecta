// Serialized version of Prisma's Resource type safe for Server → Client props.
// Next.js cannot serialize Date objects across the boundary; use this type
// whenever resources are passed to 'use client' components.
import type { Resource } from '@prisma/client'
import { localizeBare } from './locale-content'

export type SerializedResource = Omit<
  Resource,
  'verifiedAt' | 'expiresAt' | 'createdAt' | 'updatedAt'
> & {
  verifiedAt: string | null
  expiresAt: string | null
  createdAt: string
  updatedAt: string
}

export function getResourceName(resource: { name: string }, locale: string): string {
  return localizeBare(resource, 'name', locale)
}

export function serializeResource(r: Resource): SerializedResource {
  return {
    ...r,
    verifiedAt: r.verifiedAt?.toISOString() ?? null,
    expiresAt: r.expiresAt?.toISOString() ?? null,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  }
}
