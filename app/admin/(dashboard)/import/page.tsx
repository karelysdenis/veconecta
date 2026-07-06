import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getSession } from '@/lib/lucia'
import { ImportForm } from '@/components/admin/ImportForm'

export default async function ImportPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string }>
}) {
  const { user } = await getSession()
  if (!user) redirect('/admin/login')

  const { success } = await searchParams

  return (
    <div className="max-w-3xl">
      <nav className="flex items-center gap-2 mb-6 text-sm">
        <Link href="/admin" className="text-gray-400 hover:text-gray-700">Inicio</Link>
        <span className="text-gray-300">/</span>
        <span className="text-gray-900 font-medium">Importar recursos</span>
      </nav>

      <h1 className="text-xl font-bold text-gray-900 mb-2">Importar desde el PM tracker</h1>
      <p className="text-sm text-gray-500 mb-6">
        Sube el Excel de seguimiento (hoja &quot;📋 Contenido por País&quot;) para crear los recursos nuevos como borrador.
      </p>

      {success && (
        <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2 mb-6">
          Se crearon {success} recursos como borrador. Revísalos y publícalos desde cada país.
        </p>
      )}

      <ImportForm role={user.role} />
    </div>
  )
}
