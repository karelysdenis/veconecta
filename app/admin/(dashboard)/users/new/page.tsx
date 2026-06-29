import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/lucia'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { Role } from '@prisma/client'

export default async function NewUserPage() {
  const { user } = await getSession()
  if (!user) redirect('/admin/login')
  if (user.role !== 'ADMIN') redirect('/admin')

  const countries = await prisma.country.findMany({
    where: { active: true, slug: { not: 'global' } },
    select: { slug: true, nameEs: true },
    orderBy: { nameEs: 'asc' },
  })

  async function invite(fd: FormData) {
    'use server'
    const { user } = await getSession()
    if (!user || user.role !== 'ADMIN') return

    const email = (fd.get('email') as string).trim().toLowerCase()
    const role = fd.get('role') as Role
    const countrySlugs = role === 'EDITOR'
      ? fd.getAll('countrySlugs').map(v => (v as string).trim()).filter(Boolean)
      : []

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      await prisma.user.update({
        where: { email },
        data: { role, countrySlugs, isActive: true },
      })
    } else {
      await prisma.user.create({
        data: { email, role, countrySlugs },
      })
    }

    revalidatePath('/admin/users')
    redirect('/admin/users')
  }

  return (
    <div className="max-w-lg">
      <nav className="flex items-center gap-2 mb-6 text-sm">
        <Link href="/admin" className="text-gray-400 hover:text-gray-700">Inicio</Link>
        <span className="text-gray-300">/</span>
        <Link href="/admin/users" className="text-gray-400 hover:text-gray-700">Usuarios</Link>
        <span className="text-gray-300">/</span>
        <span className="text-gray-900 font-medium">Invitar colaborador</span>
      </nav>

      <h1 className="text-xl font-bold text-gray-900 mb-6">Invitar colaborador</h1>

      <form action={invite} className="bg-white border border-gray-200 rounded-xl p-6 space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input
            type="email"
            name="email"
            required
            autoComplete="off"
            placeholder="colaborador@email.com"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300"
          />
          <p className="text-xs text-gray-400 mt-1">Si ya existe, actualiza su rol y países.</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Rol</label>
          <select
            name="role"
            defaultValue="EDITOR"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300"
          >
            <option value="EDITOR">Editor — acceso solo a sus países</option>
            <option value="ADMIN">Admin — acceso total</option>
          </select>
        </div>

        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">
            Países asignados <span className="text-gray-400 font-normal">(solo para editores)</span>
          </p>
          <div className="border border-gray-200 rounded-lg divide-y divide-gray-100 overflow-hidden">
            {countries.map(c => (
              <label key={c.slug} className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 cursor-pointer">
                <input type="checkbox" name="countrySlugs" value={c.slug} className="h-4 w-4 rounded text-red-700" />
                <span className="text-sm text-gray-800">{c.nameEs}</span>
              </label>
            ))}
          </div>
        </div>

        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          El colaborador accede con magic link usando este email. No se envía ningún email desde aquí.
        </p>

        <div className="flex justify-end gap-3 pt-2">
          <Link href="/admin/users" className="text-sm text-gray-600 hover:underline px-4 py-2">Cancelar</Link>
          <button type="submit" className="bg-red-700 text-white text-sm font-medium px-5 py-2 rounded-lg hover:bg-red-800">
            Guardar
          </button>
        </div>
      </form>
    </div>
  )
}
