import { redirect } from 'next/navigation'
import { getSession } from '@/lib/lucia'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import Link from 'next/link'
import { CountrySearch } from '@/components/admin/CountrySearch'

export default async function NewCountryPage() {
  const { user } = await getSession()
  if (!user) redirect('/admin/login')
  if (user.role !== 'ADMIN') redirect('/admin')

  async function create(fd: FormData) {
    'use server'
    const { user } = await getSession()
    if (!user || user.role !== 'ADMIN') return
    const nameEs = (fd.get('nameEs') as string).trim()
    const nameEn = (fd.get('nameEn') as string).trim()
    const namePt = (fd.get('namePt') as string).trim() || null
    await prisma.country.create({
      data: {
        slug: (fd.get('slug') as string).trim().toLowerCase(),
        nameEs,
        nameEn,
        namePt,
        flag: (fd.get('flag') as string).trim(),
        cca2: (fd.get('cca2') as string).trim().toLowerCase() || null,
        active: fd.get('active') === 'on',
      },
    })
    revalidatePath('/admin')
    revalidatePath('/es')
    revalidatePath('/en')
    redirect('/admin')
  }

  return (
    <div className="max-w-2xl">
      <nav className="flex items-center gap-2 mb-6 text-sm">
        <Link href="/admin" className="text-gray-400 hover:text-gray-700">Inicio</Link>
        <span className="text-gray-300">/</span>
        <span className="text-gray-900 font-medium">Nuevo país</span>
      </nav>

      <h1 className="text-xl font-bold text-gray-900 mb-6">Nuevo país</h1>

      <form action={create} className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
        <CountrySearch />

        <label className="flex items-center gap-2 cursor-pointer pt-2">
          <input type="checkbox" name="active" defaultChecked className="h-4 w-4 rounded" />
          <span className="text-sm text-gray-700">Visible en el selector público</span>
        </label>

        <div className="flex justify-end gap-3 pt-2">
          <Link href="/admin" className="text-sm text-gray-600 hover:underline px-4 py-2">
            Cancelar
          </Link>
          <button
            type="submit"
            className="bg-red-700 text-white text-sm font-medium px-5 py-2 rounded-lg hover:bg-red-800"
          >
            Crear país
          </button>
        </div>
      </form>
    </div>
  )
}
