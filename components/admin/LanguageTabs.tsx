'use client'
import { useState } from 'react'

const LANGS = [
  { code: 'es', label: '🇪🇸 ES', title: 'Español', placeholder: 'Descripción del recurso en español…' },
  { code: 'en', label: '🇺🇸 EN', title: 'English', placeholder: 'Resource description in English…' },
  { code: 'pt', label: '🇧🇷 PT', title: 'Português', placeholder: 'Descrição do recurso em português…' },
]

export function LanguageTabs({
  defaultValues = {},
}: {
  defaultValues?: { es?: string; en?: string; pt?: string }
}) {
  const [active, setActive] = useState('es')
  const [filled, setFilled] = useState({
    es: !!(defaultValues.es ?? ''),
    en: !!(defaultValues.en ?? ''),
    pt: !!(defaultValues.pt ?? ''),
  })

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
            {filled[code as keyof typeof filled] && (
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
            )}
          </button>
        ))}
      </div>

      <div className="p-4 bg-white">
        {LANGS.map(({ code, placeholder }) => (
          <div key={code} className={active === code ? '' : 'hidden'}>
            <textarea
              name={`notes${code.charAt(0).toUpperCase()}${code.slice(1)}`}
              defaultValue={defaultValues[code as keyof typeof defaultValues] ?? ''}
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
