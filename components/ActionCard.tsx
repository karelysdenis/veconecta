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
  const [open, setOpen] = useState(false)
  const t = useTranslations('categories')

  if (category === 'DIGITAL_BRIDGE') {
    return (
      <div>
        <div className="h-px bg-[rgba(20,20,20,0.12)]" />
        <div className="py-3 px-5">
          <DigitalBridgeTutorial />
        </div>
      </div>
    )
  }

  const Icon = categoryIcons[category]

  return (
    <div>
      <div className="h-px bg-[rgba(20,20,20,0.12)]" />
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between h-16 px-5 text-left hover:bg-guacamaya/5 transition-colors"
      >
        <div className="flex items-center gap-3.5 flex-1 min-w-0">
          <div className="w-9 h-9 rounded-full bg-coco flex items-center justify-center shrink-0">
            <Icon className="w-[18px] h-[18px] text-[#184e68]" strokeWidth={1.5} />
          </div>
          <div className="flex flex-col gap-[3px]">
            <span className="font-sans font-semibold text-base text-[#141414] leading-tight">
              {t(category)}
            </span>
            {resources.length > 0 && (
              <span className="font-sans font-light text-[13px] text-caribe leading-none">
                {resources.length} recursos
              </span>
            )}
          </div>
        </div>
        <span className="font-sans font-light text-sm text-[#b8b8b8] shrink-0 ml-3">
          {open ? '−' : '+'}
        </span>
      </button>

      {open && (
        <div className="px-5 pb-4 space-y-3">
          {resources.length === 0 ? (
            <p className="font-sans font-light text-sm text-[#808080]">En preparación.</p>
          ) : (
            resources.map((r) => <ResourceLink key={r.id} resource={r} locale={locale} />)
          )}
        </div>
      )}
    </div>
  )
}
