import { notFound, redirect } from 'next/navigation'
import { getSession } from '@/lib/lucia'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import Link from 'next/link'
import { flagUrl } from '@/lib/country-iso'

export default async function EditCountryPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const { user } = await getSession()
  if (!user) redirect('/admin/login')
  if (user.role !== 'ADMIN') redirect('/admin')

  const country = await prisma.country.findUnique({ where: { slug } })
  if (!country) notFound()

  async function save(fd: FormData) {
    'use server'
    const { user } = await getSession()
    if (!user || user.role !== 'ADMIN') return
    await prisma.country.update({
      where: { slug },
      data: {
        nameEs: (fd.get('nameEs') as string).trim(),
        nameEn: (fd.get('nameEn') as string).trim(),
        namePt: (fd.get('namePt') as string).trim() || null,
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
        <span className="text-gray-900 font-medium">Editar país</span>
      </nav>

      <div className="flex items-center gap-3 mb-6">
        {(() => { const src = country.cca2 ? `https://flagcdn.com/w80/${country.cca2}.png` : flagUrl(country.slug, 'w80'); return src ? <img src={src} width={48} height={32} alt="" className="rounded-sm object-cover" /> : <span className="text-4xl leading-none">{country.flag}</span> })()}
        <h1 className="text-xl font-bold text-gray-900">{country.nameEs}</h1>
      </div>

      <form action={save} className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Slug <span className="text-xs text-gray-400 font-normal">(no editable)</span>
            </label>
            <input
              type="text"
              value={country.slug}
              disabled
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-400 cursor-not-allowed"
            />
          </div>
          <F label="Código ISO" name="cca2" defaultValue={country.cca2 ?? ''} placeholder="ej: co" note="Para mostrar la bandera" />
        </div>

        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'URL español', value: country.slugEs },
            { label: 'URL inglés', value: country.slugEn },
            { label: 'URL portugués', value: country.slugPt },
          ].map(({ label, value }) => (
            <div key={label}>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {label} <span className="text-xs text-gray-400 font-normal">(no editable)</span>
              </label>
              <input type="text" value={value ?? ''} disabled
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-400 cursor-not-allowed" />
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <F label="Nombre en español" name="nameEs" defaultValue={country.nameEs} required />
          <F label="Nombre en inglés" name="nameEn" defaultValue={country.nameEn ?? ''} required />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <F label="Nombre en portugués" name="namePt" defaultValue={country.namePt ?? ''} />
          <F label="Bandera (emoji)" name="flag" defaultValue={country.flag} />
        </div>

        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" name="active" defaultChecked={country.active} className="h-4 w-4 rounded" />
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
            Guardar cambios
          </button>
        </div>
      </form>
    </div>
  )
}

function F({
  label, name, defaultValue = '', required = false, placeholder = '', note,
}: {
  label: string; name: string; defaultValue?: string; required?: boolean; placeholder?: string; note?: string
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
        {note && <span className="text-xs text-gray-400 font-normal ml-1">({note})</span>}
      </label>
      <input
        type="text"
        name={name}
        defaultValue={defaultValue}
        required={required}
        placeholder={placeholder}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300"
      />
    </div>
  )
}
