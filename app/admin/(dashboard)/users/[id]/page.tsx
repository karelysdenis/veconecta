import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { getSession } from '@/lib/lucia'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { Role } from '@prisma/client'

export default async function EditUserPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const { user: me } = await getSession()
  if (!me) redirect('/admin/login')
  if (me.role !== 'ADMIN') redirect('/admin')

  const [target, countries] = await Promise.all([
    prisma.user.findUnique({ where: { id } }),
    prisma.country.findMany({
      where: { active: true, slug: { not: 'global' } },
      select: { slug: true, nameEs: true },
      orderBy: { nameEs: 'asc' },
    }),
  ])

  if (!target) notFound()

  async function save(fd: FormData) {
    'use server'
    const { user: me } = await getSession()
    if (!me || me.role !== 'ADMIN') return

    const role = fd.get('role') as Role
    const countrySlug = (fd.get('countrySlug') as string).trim() || null
    const isActive = fd.get('isActive') === 'on'

    await prisma.user.update({
      where: { id },
      data: {
        role,
        countrySlug: role === 'EDITOR' ? countrySlug : null,
        isActive,
      },
    })

    revalidatePath('/admin/users')
    redirect('/admin/users')
  }

  async function deleteUser() {
    'use server'
    const { user: me } = await getSession()
    if (!me || me.role !== 'ADMIN') return
    if (me.id === id) return

    await prisma.user.delete({ where: { id } })
    revalidatePath('/admin/users')
    redirect('/admin/users')
  }

  const isSelf = me.id === target.id

  return (
    <div className="max-w-lg">
      <nav className="flex items-center gap-2 mb-6 text-sm">
        <Link href="/admin" className="text-gray-400 hover:text-gray-700">Inicio</Link>
        <span className="text-gray-300">/</span>
        <Link href="/admin/users" className="text-gray-400 hover:text-gray-700">Usuarios</Link>
        <span className="text-gray-300">/</span>
        <span className="text-gray-900 font-medium truncate">{target.email}</span>
      </nav>

      <h1 className="text-xl font-bold text-gray-900 mb-1">Editar usuario</h1>
      <p className="text-sm text-gray-500 mb-6">{target.email}</p>

      <form action={save} className="bg-white border border-gray-200 rounded-xl p-6 space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Rol</label>
          <select
            name="role"
            defaultValue={target.role}
            disabled={isSelf}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300 disabled:bg-gray-50 disabled:text-gray-400"
          >
            <option value="EDITOR">Editor — acceso solo a su país</option>
            <option value="ADMIN">Admin — acceso total</option>
          </select>
          {isSelf && (
            <p className="text-xs text-gray-400 mt-1">No podés cambiar tu propio rol.</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            País asignado <span className="text-gray-400 font-normal">(solo para editores)</span>
          </label>
          <select
            name="countrySlug"
            defaultValue={target.countrySlug ?? ''}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300"
          >
            <option value="">Sin restricción</option>
            {countries.map(c => (
              <option key={c.slug} value={c.slug}>{c.nameEs}</option>
            ))}
          </select>
        </div>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            name="isActive"
            defaultChecked={target.isActive}
            disabled={isSelf}
            className="h-4 w-4 rounded"
          />
          <span className="text-sm text-gray-700">Cuenta activa</span>
          {isSelf && <span className="text-xs text-gray-400">(no podés desactivar tu propia cuenta)</span>}
        </label>

        <div className="flex items-center justify-between pt-2">
          {!isSelf ? (
            <form action={deleteUser}>
              <button
                type="submit"
                className="text-sm text-red-600 hover:underline"
                onClick={e => {
                  if (!confirm(`¿Eliminar a ${target.email}?`)) e.preventDefault()
                }}
              >
                Eliminar usuario
              </button>
            </form>
          ) : (
            <span />
          )}
          <div className="flex gap-3">
            <Link href="/admin/users" className="text-sm text-gray-600 hover:underline px-4 py-2">
              Cancelar
            </Link>
            <button
              type="submit"
              className="bg-red-700 text-white text-sm font-medium px-5 py-2 rounded-lg hover:bg-red-800"
            >
              Guardar
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
