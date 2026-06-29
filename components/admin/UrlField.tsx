'use client'
import { useState } from 'react'

export function UrlField({ defaultValue = '' }: { defaultValue?: string }) {
  const [value, setValue] = useState(defaultValue)

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">URL</label>
      <div className="flex items-center gap-2">
        <input
          type="url"
          name="url"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300"
        />
        {value && (
          <a
            href={value}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 text-xs text-blue-600 hover:underline whitespace-nowrap"
            tabIndex={-1}
          >
            Visitar ↗
          </a>
        )}
      </div>
    </div>
  )
}
