'use client'
import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Users, Heart, ArrowLeftRight, Phone, Package, Globe, Landmark, Brain, type LucideIcon } from 'lucide-react'
import { ResourceLink } from './ResourceLink'
import { DigitalBridgeTutorial } from './DigitalBridgeTutorial'
import type { ResourceCategory } from '@prisma/client'
import type { SerializedResource } from '@/lib/types'

const categoryIcons: Record<ResourceCategory, LucideIcon> = {
  FIND_FAMILY: Users,
  DONATE_MONEY: Heart,
  SEND_MONEY: ArrowLeftRight,
  CALL_FREE: Phone,
  DONATE_PHYSICALLY: Package,
  DIGITAL_BRIDGE: Globe,
  CONSULAR: Landmark,
  MENTAL_HEALTH: Brain,
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

  const Icon = categoryIcons[category]

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-4 text-left hover:bg-guacamaya/5 transition-colors"
      >
        <span className="font-semibold text-selva text-sm flex items-center gap-2">
          <Icon className="h-4 w-4 shrink-0 text-guacamaya" />
          {t(category)}
          {resources.length > 0 && (
            <span className="text-xs font-normal text-gray-400">({resources.length})</span>
          )}
        </span>
        <span className="text-gray-400 text-sm">{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="px-4 pb-4 pt-0 space-y-3 border-t border-gray-100">
          {resources.length === 0 ? (
            <p className="text-gray-400 text-sm pt-3">En preparación.</p>
          ) : (
            resources.map((r) => <ResourceLink key={r.id} resource={r} locale={locale} />)
          )}
        </div>
      )}
    </div>
  )
}
