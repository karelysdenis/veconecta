'use client'
import { useEffect, useRef, useState } from 'react'

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
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const cancelRef = useRef<HTMLButtonElement>(null)

  function close() {
    setOpen(false)
    triggerRef.current?.focus()
  }

  useEffect(() => {
    if (!open) return
    cancelRef.current?.focus()
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') close()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open])

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

  return (
    <>
      <button ref={triggerRef} type="button" onClick={() => setOpen(true)} className={className}>
        {label}
      </button>
      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={message}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={close}
        >
          <div
            className="bg-white rounded-xl shadow-lg max-w-sm w-full p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-sm text-gray-700 mb-4">{message}</p>
            <div className="flex justify-end gap-2">
              <button
                ref={cancelRef}
                type="button"
                onClick={close}
                className="text-xs border border-gray-300 text-gray-600 px-3 py-1.5 rounded hover:bg-gray-50"
              >
                Cancelar
              </button>
              <form action={action}>
                {Object.entries(hiddenFields ?? {}).map(([k, v]) => (
                  <input key={k} type="hidden" name={k} value={v} />
                ))}
                <button type="submit" className="text-xs bg-red-700 text-white px-3 py-1.5 rounded hover:bg-red-800">
                  {confirmLabel}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
