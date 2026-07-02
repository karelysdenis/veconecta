import { prisma } from './prisma'

export type AuditAction =
  | 'RESOURCE_CREATE'
  | 'RESOURCE_UPDATE'
  | 'RESOURCE_CONFIRM'
  | 'RESOURCE_PUBLISH'
  | 'RESOURCE_ARCHIVE'
  | 'USER_INVITE'
  | 'USER_UPDATE'
  | 'USER_DELETE'
  | 'COUNTRY_CREATE'
  | 'COUNTRY_UPDATE'
  | 'COUNTRY_DELETE'
  | 'LOCALE_TOGGLE'

export async function logAction(params: {
  userEmail: string
  action: AuditAction
  entityType: 'resource' | 'user' | 'country' | 'locale'
  entityId?: string
  entityName?: string
  countrySlug?: string
  detail?: string
}) {
  await prisma.auditLog.create({ data: params })
}

/** Bumps Country.lastUpdatedAt so the homepage "last updated" date reflects resource changes. */
export async function touchCountry(countrySlug: string) {
  await prisma.country.update({
    where: { slug: countrySlug },
    data: { lastUpdatedAt: new Date() },
  })
}
