import { notFound, redirect } from 'next/navigation'
import { getSession } from '@/lib/lucia'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import Link from 'next/link'

export default async function EditCityPage({
  params,
}: {
  params: Promise<{ slug: string; cityId: string }>
}) {
  const { slug, cityId } = await params
  const { user } = await getSession()
  if (!user) redirect('/admin/login')
  if (user.role !== 'ADMIN') redirect('/admin')

  const city = await prisma.city.findUnique({ where: { id: cityId } })
  if (!city || city.countrySlug !== slug) notFound()

  async function save(fd: FormData) {
    'use server'
    const { user } = await getSession()
    if (!user || user.role !== 'ADMIN') return
    const nameEs = (fd.get('nameEs') as string).trim()
    if (!nameEs) return
    await prisma.city.update({
      where: { id: cityId, countrySlug: slug },
      data: {
        nameEs,
        nameEn: (fd.get('nameEn') as string).trim() || null,
        namePt: (fd.get('namePt') as string).trim() || null,
        nameFr: (fd.get('nameFr') as string).trim() || null,
        nameDe: (fd.get('nameDe') as string).trim() || null,
      },
    })
    revalidatePath(`/admin/countries/${slug}`)
    redirect(`/admin/countries/${slug}`)
  }

  return (
    <div className="max-w-2xl">
      <nav className="flex items-center gap-2 mb-6 text-sm">
        <Link href="/admin" className="text-gray-400 hover:text-gray-700">Inicio</Link>
        <span className="text-gray-300">/</span>
        <Link href={`/admin/countries/${slug}`} className="text-gray-400 hover:text-gray-700">Editar país</Link>
        <span className="text-gray-300">/</span>
        <span className="text-gray-900 font-medium">{city.nameEs}</span>
      </nav>

      <h1 className="text-xl font-bold text-gray-900 mb-6">Editar ciudad</h1>

      <form action={save} className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Slug <span className="text-xs text-gray-400 font-normal">(no editable: afecta URLs públicas)</span>
          </label>
          <input type="text" value={city.slug} disabled
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-400 cursor-not-allowed font-mono" />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <F label="Nombre ES" name="nameEs" defaultValue={city.nameEs} required />
          <F label="Nombre EN" name="nameEn" defaultValue={city.nameEn ?? ''} />
          <F label="Nombre PT" name="namePt" defaultValue={city.namePt ?? ''} />
        </div>
        <div className="grid grid-cols-3 gap-4">
          <F label="Nombre FR" name="nameFr" defaultValue={city.nameFr ?? ''} />
          <F label="Nombre DE" name="nameDe" defaultValue={city.nameDe ?? ''} />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Link href={`/admin/countries/${slug}`} className="text-sm text-gray-600 hover:underline px-4 py-2">
            Cancelar
          </Link>
          <button type="submit"
            className="bg-red-700 text-white text-sm font-medium px-5 py-2 rounded-lg hover:bg-red-800">
            Guardar cambios
          </button>
        </div>
      </form>
    </div>
  )
}

function F({ label, name, defaultValue = '', required = false }: {
  label: string; name: string; defaultValue?: string; required?: boolean
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input type="text" name={name} defaultValue={defaultValue} required={required}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300" />
    </div>
  )
}
