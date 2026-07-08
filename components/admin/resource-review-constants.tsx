import { flagUrl } from '@/lib/country-iso'
import { FlagImage } from '@/components/admin/FlagImage'

export const CATEGORY_LABELS: Record<string, string> = {
  FIND_FAMILY: 'Encontrar familia',
  DONATE_MONEY: 'Donar dinero',
  SEND_MONEY: 'Enviar dinero',
  CALL_FREE: 'Llamada gratuita',
  DONATE_PHYSICALLY: 'Donación física',
  DIGITAL_BRIDGE: 'Puente digital',
  CONSULAR: 'Consular',
  MENTAL_HEALTH: 'Salud mental',
}

export const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Borrador',
  PUBLISHED: 'Publicado',
  ARCHIVED: 'Archivado',
}

export const STATUS_STYLES: Record<string, string> = {
  DRAFT: 'text-amber-700 bg-amber-50 border-amber-200',
  PUBLISHED: 'text-blue-700 bg-blue-50 border-blue-200',
  ARCHIVED: 'text-gray-500 bg-gray-50 border-gray-200',
}

export function isToday(date: Date) {
  const now = new Date()
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  )
}

export function Flag({
  cca2,
  slug,
  flag,
  size = 20,
}: {
  cca2: string | null
  slug: string
  flag: string
  size?: number
}) {
  const src = cca2 ? `https://flagcdn.com/w40/${cca2}.png` : flagUrl(slug)
  return <FlagImage src={src} flag={flag} size={size} />
}
