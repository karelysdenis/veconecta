'use client'
import { useState } from 'react'

export function ConfirmButton({
  action,
  hiddenFields,
  label,
  confirmLabel = 'Confirmar',
  message,
  disabled,
  disabledReason,
  className = 'text-xs border border-red-100 text-red-400 px-2.5 py-1 rounded hover:bg-red-50',
}: {
  action: (fd: FormData) => void
  hiddenFields?: Record<string, string>
  label: string
  confirmLabel?: string
  message: string
  disabled?: boolean
  disabledReason?: string
  className?: string
}) {
  const [confirming, setConfirming] = useState(false)

  if (disabled) {
    return (
      <span
        title={disabledReason}
        className={`${className} opacity-30 cursor-not-allowed`}
      >
        {label}
      </span>
    )
  }

  if (!confirming) {
    return (
      <button type="button" onClick={() => setConfirming(true)} className={className}>
        {label}
      </button>
    )
  }

  return (
    <div className="inline-flex items-center gap-2 flex-wrap justify-end">
      <span className="text-xs text-gray-600">{message}</span>
      <form action={action}>
        {Object.entries(hiddenFields ?? {}).map(([k, v]) => (
          <input key={k} type="hidden" name={k} value={v} />
        ))}
        <button type="submit" className="text-xs bg-red-700 text-white px-2.5 py-1 rounded">
          {confirmLabel}
        </button>
      </form>
      <button
        type="button"
        onClick={() => setConfirming(false)}
        className="text-xs border border-gray-300 text-gray-600 px-2.5 py-1 rounded"
      >
        Cancelar
      </button>
    </div>
  )
}
