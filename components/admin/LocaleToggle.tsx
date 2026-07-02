'use client'
import { useState, useRef, useEffect } from 'react'

export function LocaleToggle({
  code,
  label,
  active,
  resourceCount,
  disabled,
  action,
}: {
  code: string
  label: string
  active: boolean
  resourceCount: number
  disabled?: boolean
  action: (fd: FormData) => void
}) {
  const [confirming, setConfirming] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setConfirming(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  if (disabled) {
    return (
      <span className="text-xs font-medium px-3 py-1.5 rounded-full border bg-green-50 text-green-700 border-green-200 opacity-50 cursor-not-allowed">
        Activo
      </span>
    )
  }

  if (!active) {
    return (
      <form action={action}>
        <input type="hidden" name="code" value={code} />
        <button
          type="submit"
          className="text-xs font-medium px-3 py-1.5 rounded-full border bg-gray-50 text-gray-500 border-gray-200 hover:opacity-80"
        >
          Inactivo
        </button>
      </form>
    )
  }

  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        onClick={() => setConfirming((v) => !v)}
        className="text-xs font-medium px-3 py-1.5 rounded-full border bg-green-50 text-green-700 border-green-200 hover:opacity-80"
      >
        Activo
      </button>

      {confirming && (
        <div className="absolute z-50 top-full mt-2 left-1/2 -translate-x-1/2 w-52 bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-left normal-case">
          <p className="text-xs text-gray-600 leading-snug mb-2 font-normal">
            {resourceCount > 0
              ? `${resourceCount} recurso${resourceCount === 1 ? '' : 's'} con contenido en ${label} dejará${resourceCount === 1 ? '' : 'n'} de mostrarse.`
              : `Ningún recurso tiene contenido en ${label} todavía.`}{' '}
            Se quita de todo el sitio.
          </p>
          <div className="flex gap-2">
            <form action={action}>
              <input type="hidden" name="code" value={code} />
              <button type="submit" className="text-xs bg-red-700 text-white px-2.5 py-1 rounded">
                Sí, desactivar
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
        </div>
      )}
    </div>
  )
}
