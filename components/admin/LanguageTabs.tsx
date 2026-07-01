'use client'
import { useState } from 'react'
import { LOCALES, LOCALE_SUFFIX, LOCALE_LABELS, type Locale } from '@/lib/locale-content'

const PLACEHOLDERS: Record<Locale, string> = {
  es: 'Descripción del recurso en español…',
  en: 'Resource description in English…',
  pt: 'Descrição do recurso em português…',
}

const LANGS = LOCALES.map((code) => ({
  code,
  label: code.toUpperCase(),
  title: LOCALE_LABELS[code],
  name: `notes${LOCALE_SUFFIX[code]}`,
  placeholder: PLACEHOLDERS[code],
}))

type Values = Partial<Record<Locale, string>>

export function LanguageTabs({
  defaultValues = {},
}: {
  defaultValues?: Values
}) {
  const [active, setActive] = useState<Locale>('es')
  const [filled, setFilled] = useState<Record<Locale, boolean>>(() =>
    Object.fromEntries(LOCALES.map((l) => [l, !!(defaultValues[l] ?? '')])) as Record<Locale, boolean>,
  )

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <div className="flex border-b border-gray-200 bg-gray-50">
        {LANGS.map(({ code, label, title }) => (
          <button
            key={code}
            type="button"
            title={title}
            onClick={() => setActive(code)}
            className={`flex items-center gap-1.5 px-5 py-2.5 text-sm font-medium transition-colors ${
              active === code
                ? 'bg-white text-red-700 border-b-2 border-red-600 -mb-px'
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            {label}
            {filled[code] && (
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
            )}
          </button>
        ))}
      </div>

      <div className="p-4 bg-white">
        {LANGS.map(({ code, name, placeholder }) => (
          <div key={code} className={active === code ? '' : 'hidden'}>
            <textarea
              name={name}
              defaultValue={defaultValues[code] ?? ''}
              rows={5}
              placeholder={placeholder}
              onChange={(e) => setFilled(prev => ({ ...prev, [code]: e.target.value.trim().length > 0 }))}
              className="w-full text-sm focus:outline-none resize-none placeholder:text-gray-300"
            />
          </div>
        ))}
      </div>
    </div>
  )
}
