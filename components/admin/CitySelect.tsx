'use client'
import { useState } from 'react'

const NEW_CITY_VALUE = '__new__'

export function CitySelect({
  cities,
  defaultValue = '',
}: {
  cities: { id: string; nameEs: string }[]
  defaultValue?: string
}) {
  const [creating, setCreating] = useState(false)

  if (creating) {
    return (
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Nueva ciudad / región</label>
        <div className="flex gap-2">
          <input
            type="text"
            name="newCityName"
            placeholder="ej: Bogotá"
            autoFocus
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300"
          />
          <button
            type="button"
            onClick={() => setCreating(false)}
            className="shrink-0 text-sm border border-gray-300 text-gray-600 px-3 rounded-lg hover:bg-gray-50"
          >
            Cancelar
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-1">
          Se crea al guardar. Otros idiomas y datos de la ciudad se completan después desde el país.
        </p>
      </div>
    )
  }

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">Ciudad / Región</label>
      <select
        name="cityId"
        defaultValue={defaultValue}
        onChange={(e) => {
          if (e.target.value === NEW_CITY_VALUE) setCreating(true)
        }}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300"
      >
        <option value="">— Nacional (sin ciudad específica)</option>
        {cities.map((c) => (
          <option key={c.id} value={c.id}>{c.nameEs}</option>
        ))}
        <option value={NEW_CITY_VALUE}>+ Nueva ciudad…</option>
      </select>
    </div>
  )
}
