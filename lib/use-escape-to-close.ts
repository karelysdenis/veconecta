'use client'
import { useEffect } from 'react'

export function useEscapeToClose(open: boolean, onClose: () => void) {
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      // A native <select>'s own dropdown also closes on Escape — if focus is
      // still on the select, that's what the keypress was for, not us.
      // Without this guard, Escape-to-dismiss-the-select-popup also closes
      // (and resets) the whole dialog.
      if (document.activeElement instanceof HTMLSelectElement) return
      onClose()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])
}
