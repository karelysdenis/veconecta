import { redirect } from 'next/navigation'
import { getSession } from '@/lib/lucia'
import type { ReactNode } from 'react'

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const { user } = await getSession()
  if (!user || !user.isActive) redirect('/admin/login')

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between gap-3">
        <span className="font-bold text-gray-900 whitespace-nowrap">VEconecta Admin</span>
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-sm text-gray-500 truncate max-w-[160px] sm:max-w-none" title={user.email}>
            {user.email}
          </span>
          <form action="/api/auth/logout" method="POST" className="shrink-0">
            <button type="submit" className="text-sm text-red-700 hover:underline">
              Salir
            </button>
          </form>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-4 py-5 sm:py-8">{children}</main>
    </div>
  )
}
