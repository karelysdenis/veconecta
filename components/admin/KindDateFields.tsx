'use client'
import { useState } from 'react'
import { ResourceKind } from '@prisma/client'

const KINDS = Object.values(ResourceKind)

const KIND_LABELS: Record<string, string> = {
  PERMANENT: 'Permanente',
  EVENT: 'Evento (fecha fija)',
}

const inputClass = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300'

export function KindDateFields({
  defaultKind = ResourceKind.PERMANENT,
  defaultValidUntil = '',
  defaultEventStartsAt = '',
  defaultEventEndsAt = '',
}: {
  defaultKind?: ResourceKind
  defaultValidUntil?: string
  defaultEventStartsAt?: string
  defaultEventEndsAt?: string
}) {
  const [kind, setKind] = useState<ResourceKind>(defaultKind)

  return (
    <>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
        <select
          name="kind"
          value={kind}
          onChange={(e) => setKind(e.target.value as ResourceKind)}
          className={inputClass}
        >
          {KINDS.map((k) => (
            <option key={k} value={k}>{KIND_LABELS[k] ?? k}</option>
          ))}
        </select>
      </div>

      {kind === ResourceKind.PERMANENT && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Válido hasta (opcional, solo si el recurso tiene fecha de fin)</label>
          <input type="date" name="validUntil" defaultValue={defaultValidUntil} className={inputClass} />
        </div>
      )}

      {kind === ResourceKind.EVENT && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Inicio del evento</label>
            <input type="date" name="eventStartsAt" defaultValue={defaultEventStartsAt} className={inputClass} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fin del evento</label>
            <input type="date" name="eventEndsAt" defaultValue={defaultEventEndsAt} className={inputClass} />
          </div>
        </div>
      )}
    </>
  )
}
