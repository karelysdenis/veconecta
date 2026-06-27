'use client'
import { useState } from 'react'
import { useSearchParams } from 'next/navigation'

export default function LoginForm() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'sent' | 'error'>('idle')
  const searchParams = useSearchParams()
  const errorParam = searchParams.get('error')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('loading')
    try {
      const res = await fetch('/api/auth/magic-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      if (!res.ok) throw new Error()
      setStatus('sent')
    } catch {
      setStatus('error')
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 w-full max-w-sm">
      <h1 className="text-xl font-bold text-gray-900 mb-1">VeConecta</h1>
      <p className="text-sm text-gray-500 mb-6">Panel de administración</p>

      {errorParam === 'expired' && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4 text-sm text-amber-800">
          El enlace ha caducado. Solicita uno nuevo.
        </div>
      )}
      {errorParam === 'invalid' && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 text-sm text-red-800">
          Enlace inválido. Solicita uno nuevo.
        </div>
      )}

      {status === 'sent' ? (
        <div className="text-center py-4">
          <p className="text-gray-700 font-medium mb-1">Revisa tu email</p>
          <p className="text-gray-500 text-sm">
            Te hemos enviado un enlace de acceso a <strong>{email}</strong>. Válido 15 minutos.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="tu@email.com"
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300"
            />
          </div>
          {status === 'error' && (
            <p className="text-sm text-red-600">Error al enviar. Inténtalo de nuevo.</p>
          )}
          <button
            type="submit"
            disabled={status === 'loading'}
            className="w-full bg-red-700 text-white py-2 rounded-lg text-sm font-medium disabled:opacity-50"
          >
            {status === 'loading' ? 'Enviando...' : 'Enviar enlace de acceso'}
          </button>
        </form>
      )}
    </div>
  )
}
