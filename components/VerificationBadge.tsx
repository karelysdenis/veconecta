'use client'
import { useTranslations } from 'next-intl'

type BadgeStatus = 'verified' | 'unverified' | 'expired'

function getBadgeStatus(verifiedAt: Date | string | null): BadgeStatus {
  if (!verifiedAt) return 'expired'
  const verifiedDate = typeof verifiedAt === 'string' ? new Date(verifiedAt) : verifiedAt
  const daysSince = (Date.now() - verifiedDate.getTime()) / (1000 * 60 * 60 * 24)
  if (daysSince < 5) return 'verified'
  if (daysSince < 14) return 'unverified'
  return 'expired'
}

const statusStyles: Record<BadgeStatus, string> = {
  verified: 'bg-green-100 text-green-800',
  unverified: 'bg-amber-100 text-amber-800',
  expired: 'bg-red-100 text-red-800',
}

export function VerificationBadge({
  verifiedAt,
}: {
  verifiedAt: Date | string | null
}) {
  const t = useTranslations('verification')
  const status = getBadgeStatus(verifiedAt)
  const dateStr = verifiedAt
    ? new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short' }).format(
        typeof verifiedAt === 'string' ? new Date(verifiedAt) : verifiedAt
      )
    : null

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${statusStyles[status]}`}
    >
      {status === 'verified' && dateStr ? t('lastChecked', { date: dateStr }) : t(status)}
    </span>
  )
}
