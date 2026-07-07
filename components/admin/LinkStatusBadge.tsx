import type { LinkStatus } from '@/lib/link-check'

const STYLES: Record<LinkStatus, string> = {
  ok: 'text-green-700 bg-green-50 border-green-200',
  broken: 'text-red-700 bg-red-50 border-red-200',
  unknown: 'text-gray-500 bg-gray-50 border-gray-200',
}

const LABELS: Record<LinkStatus, string> = {
  ok: '🟢 Enlace OK',
  broken: '🔴 Enlace roto',
  unknown: '⚪ No se pudo comprobar',
}

export function LinkStatusBadge({ status }: { status: LinkStatus | 'none' }) {
  if (status === 'none') return null
  return (
    <span className={`text-xs px-2 py-1 rounded border shrink-0 ${STYLES[status]}`}>
      {LABELS[status]}
    </span>
  )
}
