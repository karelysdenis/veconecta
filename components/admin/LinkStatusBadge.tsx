import type { LinkStatus } from '@/lib/link-check'

const ICONS: Record<LinkStatus, string> = {
  ok: '🟢',
  broken: '🔴',
  unknown: '⚪',
}

const LABELS: Record<LinkStatus, string> = {
  ok: 'Enlace OK',
  broken: 'Enlace roto',
  unknown: 'No se pudo comprobar',
}

export function LinkStatusBadge({ status }: { status: LinkStatus | 'none' }) {
  if (status === 'none') return null
  return (
    <span title={LABELS[status]} aria-label={LABELS[status]} className="shrink-0">
      {ICONS[status]}
    </span>
  )
}
