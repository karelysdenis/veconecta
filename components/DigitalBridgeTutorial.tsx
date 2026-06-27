'use client'
import { useState } from 'react'
import { useTranslations } from 'next-intl'

export function DigitalBridgeTutorial() {
  const [open, setOpen] = useState(false)
  const t = useTranslations('digitalBridge')

  const steps = [t('step1'), t('step2'), t('step3'), t('step4'), t('step5')]

  return (
    <div className="border border-blue-200 rounded-lg bg-blue-50">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-4 text-left"
      >
        <div>
          <p className="font-semibold text-blue-900 text-sm">{t('title')}</p>
          {!open && <p className="text-blue-700 text-xs mt-0.5">{t('subtitle')}</p>}
        </div>
        <span className="text-blue-700 text-lg shrink-0 ml-2">{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="px-4 pb-4">
          <p className="text-blue-700 text-xs mb-3">{t('subtitle')}</p>
          <ol className="space-y-2">
            {steps.map((step, i) => (
              <li key={i} className="flex gap-2 text-sm text-blue-900">
                <span className="bg-blue-700 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs shrink-0 mt-0.5">
                  {i + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  )
}
