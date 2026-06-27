'use client'
import { useState } from 'react'
import { useTranslations } from 'next-intl'

export function ReportForm({ countrySlug }: { countrySlug: string }) {
  const [open, setOpen] = useState(false)
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
        body: JSON.stringify({ countrySlug, message }),
      })
      if (!res.ok) throw new Error()
      setStatus('success')
      setMessage('')
    } catch {
      setStatus('error')
    }
  }

  return (
    <div className="mt-6 border-t border-gray-100 pt-4">
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="text-xs text-gray-500 underline hover:text-gray-700"
        >
          {t('title')}
        </button>
      ) : status === 'success' ? (
        <p className="text-xs text-green-700">{t('success')}</p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-2">
          <label className="block text-xs font-medium text-gray-700">{t('title')}</label>
          <textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder={t('placeholder')}
            rows={3}
            className="w-full text-sm border border-gray-300 rounded-lg p-2 resize-none focus:outline-none focus:ring-2 focus:ring-red-300"
          />
          {status === 'error' && <p className="text-xs text-red-600">{t('error')}</p>}
          <button
            type="submit"
            disabled={status === 'loading' || !message.trim()}
            className="text-sm bg-red-700 text-white px-4 py-1.5 rounded-lg disabled:opacity-50"
          >
            {status === 'loading' ? '...' : t('submit')}
          </button>
        </form>
      )}
    </div>
  )
}
