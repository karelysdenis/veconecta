import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/lucia'
import { prisma } from '@/lib/prisma'

export default async function UsersPage() {
  const { user } = await getSession()
  if (!user) redirect('/admin/login')
  if (user.role !== 'ADMIN') redirect('/admin')

  const users = await prisma.user.findMany({
    orderBy: [{ role: 'asc' }, { createdAt: 'asc' }],
  })

  const countries = await prisma.country.findMany({
    where: { active: true, slug: { not: 'global' } },
    select: { slug: true, nameEs: true },
    orderBy: { nameEs: 'asc' },
  })

  const countryMap = Object.fromEntries(countries.map(c => [c.slug, c.nameEs]))

  return (
    <div>
      <nav className="flex items-center gap-2 mb-6 text-sm">
        <Link href="/admin" className="text-gray-400 hover:text-gray-700">Inicio</Link>
        <span className="text-gray-300">/</span>
        <span className="text-gray-900 font-medium">Usuarios</span>
      </nav>

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-900">Usuarios</h1>
        <Link
          href="/admin/users/new"
          className="text-sm bg-gray-900 text-white px-4 py-2 rounded-lg hover:bg-gray-700"
        >
          + Invitar colaborador
        </Link>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="grid grid-cols-[1fr_auto_auto_auto] border-b border-gray-200 bg-gray-50 px-5 py-2.5">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Email</span>
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide text-center px-4">Rol</span>
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide text-center px-4">Países</span>
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide text-center px-4">Estado</span>
        </div>

        {users.map((u, i) => (
          <Link
            key={u.id}
            href={`/admin/users/${u.id}`}
            className={`grid grid-cols-[1fr_auto_auto_auto] px-5 py-3.5 items-center hover:bg-gray-50 transition-colors ${
              i < users.length - 1 ? 'border-b border-gray-100' : ''
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-sm text-gray-900 truncate">{u.email}</span>
              {u.id === user.id && (
                <span className="text-[10px] bg-caribe/10 text-caribe border border-caribe/20 rounded px-1.5 leading-4 shrink-0">tú</span>
              )}
            </div>
            <div className="px-4 text-center">
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                u.role === 'ADMIN'
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-100 text-gray-600'
              }`}>
                {u.role === 'ADMIN' ? 'Admin' : 'Editor'}
              </span>
            </div>
            <div className="px-4 text-center">
              {(u.countrySlugs ?? []).length === 0 ? (
                <span className="text-gray-300">—</span>
              ) : (u.countrySlugs ?? []).length === 1 ? (
                <span className="text-sm text-gray-500">{countryMap[u.countrySlugs[0]] ?? u.countrySlugs[0]}</span>
              ) : (
                <span className="text-sm text-gray-500">{(u.countrySlugs ?? []).length} países</span>
              )}
            </div>
            <div className="px-4 text-center">
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                u.isActive
                  ? 'bg-green-100 text-green-700'
                  : 'bg-red-100 text-red-600'
              }`}>
                {u.isActive ? 'Activo' : 'Inactivo'}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
