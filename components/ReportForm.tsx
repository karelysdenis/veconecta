'use client'
import { useState } from 'react'
import { useTranslations } from 'next-intl'

export function ReportForm({
  countrySlug,
  resourceId,
  inline,
}: {
  countrySlug: string
  resourceId?: string
  inline?: boolean
}) {
  const [open, setOpen] = useState(inline ?? false)
  const [message, setMessage] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const t = useTranslations('report')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!message.trim()) return
    setStatus('loading')
    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ countrySlug, resourceId, message }),
      })
      if (!res.ok) throw new Error()
      setStatus('success')
      setMessage('')
    } catch {
      setStatus('error')
    }
  }

  return (
    <div className="pt-2">
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="font-sans font-light text-xs text-[#b8b8b8] underline underline-offset-2 hover:text-[#808080] transition-colors"
        >
          {t('title')}
        </button>
      ) : status === 'success' ? (
        <p className="font-sans font-light text-xs text-[#808080]">{t('success')}</p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-2">
          <label className="block font-sans font-light text-xs text-[#808080]">{t('title')}</label>
          <textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder={t('placeholder')}
            rows={3}
            className="w-full font-sans text-sm text-[#141414] border border-black/[0.12] rounded-lg p-3 resize-none focus:outline-none focus:ring-1 focus:ring-caribe"
          />
          {status === 'error' && (
            <p className="font-sans font-light text-xs text-emergencia">{t('error')}</p>
          )}
          <button
            type="submit"
            disabled={status === 'loading' || !message.trim()}
            className="font-sans font-semibold text-sm bg-caribe text-white px-5 py-2 rounded-lg disabled:opacity-40 hover:bg-caribe/90 transition-colors"
          >
            {status === 'loading' ? '...' : t('submit')}
          </button>
        </form>
      )}
    </div>
  )
}
