'use client'
import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { ResourceLink } from './ResourceLink'
import { DigitalBridgeTutorial } from './DigitalBridgeTutorial'
import type { ResourceCategory } from '@prisma/client'
import type { SerializedResource } from '@/lib/types'

const categoryIcons: Record<ResourceCategory, string> = {
  FIND_FAMILY: '🔴',
  DONATE_MONEY: '💸',
  SEND_MONEY: '💱',
  CALL_FREE: '📞',
  DONATE_PHYSICALLY: '📦',
  DIGITAL_BRIDGE: '🌉',
  CONSULAR: '🏛',
  MENTAL_HEALTH: '🧠',
}

export function ActionCard({
  category,
  resources,
  locale,
}: {
  category: ResourceCategory
  resources: SerializedResource[]
  locale: 'es' | 'en' | 'pt'
}) {
  const [open, setOpen] = useState(category === 'FIND_FAMILY')
  const t = useTranslations('categories')

  if (category === 'DIGITAL_BRIDGE') {
    return (
      <div className="py-1">
        <DigitalBridgeTutorial />
      </div>
    )
  }

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-4 text-left bg-gray-50 hover:bg-gray-100 transition-colors"
      >
        <span className="font-semibold text-gray-900 text-sm flex items-center gap-2">
          <span>{categoryIcons[category]}</span>
          {t(category)}
          {resources.length > 0 && (
            <span className="text-xs font-normal text-gray-500">({resources.length})</span>
          )}
        </span>
        <span className="text-gray-400 text-sm">{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="p-4 space-y-3">
          {resources.length === 0 ? (
            <p className="text-gray-500 text-sm">En preparación.</p>
          ) : (
            resources.map((r) => <ResourceLink key={r.id} resource={r} locale={locale} />)
          )}
        </div>
      )}
    </div>
  )
}
