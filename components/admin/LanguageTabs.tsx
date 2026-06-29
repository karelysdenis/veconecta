'use client'
import { useState } from 'react'

const LANGS = [
  { code: 'es', label: 'Español' },
  { code: 'en', label: 'English' },
  { code: 'pt', label: 'Português' },
]

export function LanguageTabs({
  defaultValues = {},
}: {
  defaultValues?: { es?: string; en?: string; pt?: string }
}) {
  const [active, setActive] = useState('es')

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <div className="flex border-b border-gray-200 bg-gray-50">
        {LANGS.map(({ code, label }) => (
          <button
            key={code}
            type="button"
            onClick={() => setActive(code)}
            className={`px-5 py-2.5 text-sm font-medium transition-colors ${
              active === code
                ? 'bg-white text-red-700 border-b-2 border-red-600 -mb-px'
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="p-4 bg-white">
        {LANGS.map(({ code }) => (
          <div key={code} className={active === code ? '' : 'hidden'}>
            <textarea
              name={`notes${code.charAt(0).toUpperCase()}${code.slice(1)}`}
              defaultValue={defaultValues[code as keyof typeof defaultValues] ?? ''}
              rows={5}
              placeholder={`Descripción del recurso en ${LANGS.find(l => l.code === code)?.label}…`}
              className="w-full text-sm focus:outline-none resize-none placeholder:text-gray-300"
            />
          </div>
        ))}
      </div>
    </div>
  )
}
