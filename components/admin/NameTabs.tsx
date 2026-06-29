'use client'
import { useState } from 'react'

const LANGS = [
  { code: 'es', label: 'Español', name: 'name', required: true },
  { code: 'en', label: 'English', name: 'nameEn', required: false },
  { code: 'pt', label: 'Português', name: 'namePt', required: false },
]

export function NameTabs({
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
        {LANGS.map(({ code, name, required }) => (
          <div key={code} className={active === code ? '' : 'hidden'}>
            <input
              type="text"
              name={name}
              required={required}
              defaultValue={defaultValues[code as keyof typeof defaultValues] ?? ''}
              placeholder={code === 'es' ? 'Nombre del recurso…' : code === 'en' ? 'Resource name…' : 'Nome do recurso…'}
              className="w-full text-sm border-0 focus:outline-none placeholder:text-gray-300"
            />
          </div>
        ))}
      </div>
    </div>
  )
}
