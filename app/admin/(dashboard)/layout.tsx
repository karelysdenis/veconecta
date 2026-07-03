import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getSession } from '@/lib/lucia'
import type { ReactNode } from 'react'

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const { user } = await getSession()
  if (!user || !user.isActive) redirect('/admin/login')

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <span className="font-bold text-gray-900">VEconecta Admin</span>
        <div className="flex items-center gap-3">
          {user.role === 'ADMIN' && (
            <Link
              href="/admin/activity"
              title="Logs de actividad"
              className="border border-gray-300 text-gray-600 p-2 rounded-lg hover:bg-gray-100"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="16" y1="13" x2="8" y2="13"/>
                <line x1="16" y1="17" x2="8" y2="17"/>
                <polyline points="10 9 9 9 8 9"/>
              </svg>
            </Link>
          )}
          <span className="text-sm text-gray-500">{user.email}</span>
          <form action="/api/auth/logout" method="POST">
            <button type="submit" className="text-sm text-red-700 hover:underline">
              Salir
            </button>
          </form>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-4 py-8">{children}</main>
    </div>
  )
}
