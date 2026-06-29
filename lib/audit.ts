import { prisma } from './prisma'

export type AuditAction =
  | 'RESOURCE_CREATE'
  | 'RESOURCE_UPDATE'
  | 'RESOURCE_PUBLISH'
  | 'RESOURCE_ARCHIVE'
  | 'USER_INVITE'
  | 'USER_UPDATE'
  | 'USER_DELETE'
  | 'COUNTRY_CREATE'
  | 'COUNTRY_UPDATE'

export async function logAction(params: {
  userEmail: string
  action: AuditAction
  entityType: 'resource' | 'user' | 'country'
  entityId?: string
  entityName?: string
  countrySlug?: string
  detail?: string
}) {
  await prisma.auditLog.create({ data: params })
}
