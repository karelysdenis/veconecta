'use client'
import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Users, Heart, ArrowLeftRight, Phone, Package, Globe, Landmark, Brain, type LucideIcon } from 'lucide-react'
import { ResourceLink } from './ResourceLink'
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
  const [open, setOpen] = useState(true)
  const t = useTranslations('categories')

  if (resources.length === 0) return null

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
          <span className="font-sans font-semibold text-base text-[#141414] leading-tight">
            {t(category)}
          </span>
          <span className="font-sans text-[12px] font-semibold text-caribe bg-caribe/10 rounded-full px-2 py-0.5 leading-none shrink-0">
            {resources.length}
          </span>
        </div>
        <span className="font-sans text-lg text-[#b8b8b8] shrink-0 ml-3 select-none">
          {open ? '−' : '+'}
        </span>
      </button>

      {open && (
        <div>
          {resources.map((r) => (
            <ResourceLink key={r.id} resource={r} locale={locale} />
          ))}
        </div>
      )}
    </div>
  )
}
