import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getSession } from '@/lib/lucia'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { slugify } from '@/lib/slugify'
import { logAction } from '@/lib/audit'
import { LOCALES } from '@/lib/locale-content'
import { PostStatus } from '@prisma/client'

export default async function NewUpdatePage() {
  const { user } = await getSession()
  if (!user) redirect('/admin/login')
  if (user.role !== 'ADMIN') redirect('/admin')

  async function create(fd: FormData) {
    'use server'
    const { user } = await getSession()
    if (!user || user.role !== 'ADMIN') return

    const title = (fd.get('title') as string).trim()
    const titleEn = (fd.get('titleEn') as string | null)?.trim() || null
    const body = (fd.get('body') as string).trim()
    const bodyEn = (fd.get('bodyEn') as string | null)?.trim() || null
    const imageUrl = (fd.get('imageUrl') as string | null)?.trim() || null
    const status = (fd.get('status') as PostStatus) || PostStatus.DRAFT

    const baseSlug = slugify(title)
    let slug = baseSlug
    let suffix = 2
    while (await prisma.post.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${suffix}`
      suffix += 1
    }

    const post = await prisma.post.create({
      data: {
        slug,
        title,
        titleEn,
        body,
        bodyEn,
        imageUrl,
        status,
        publishedAt: status === PostStatus.PUBLISHED ? new Date() : null,
      },
    })

    await logAction({
      userEmail: user.email,
      action: 'POST_CREATE',
      entityType: 'post',
      entityId: post.id,
      entityName: post.title,
    })

    revalidatePath('/admin/updates')
    for (const l of LOCALES) revalidatePath(`/${l}/noticias`)
    redirect('/admin/updates')
  }

  return (
    <div className="max-w-2xl">
      <nav className="flex items-center gap-2 mb-6 text-sm">
        <Link href="/admin" className="text-gray-400 hover:text-gray-700">Inicio</Link>
        <span className="text-gray-300">/</span>
        <Link href="/admin/updates" className="text-gray-400 hover:text-gray-700">Noticias</Link>
        <span className="text-gray-300">/</span>
        <span className="text-gray-900 font-medium">Nueva noticia</span>
      </nav>

      <h1 className="text-xl font-bold text-gray-900 mb-6">Nueva noticia</h1>

      <form action={create} className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
        <F label="Título (español)" name="title" required />
        <F label="Título (inglés)" name="titleEn" />
        <TA label="Cuerpo (español)" name="body" required rows={8} />
        <TA label="Cuerpo (inglés)" name="bodyEn" rows={8} />
        <F label="URL de imagen" name="imageUrl" note="Horizontal, opcional" />

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
          <select
            name="status"
            defaultValue={PostStatus.DRAFT}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300"
          >
            <option value={PostStatus.DRAFT}>Borrador</option>
            <option value={PostStatus.PUBLISHED}>Publicado</option>
          </select>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Link href="/admin/updates" className="text-sm text-gray-600 hover:underline px-4 py-2">
            Cancelar
          </Link>
          <button
            type="submit"
            className="bg-red-700 text-white text-sm font-medium px-5 py-2 rounded-lg hover:bg-red-800"
          >
            Crear noticia
          </button>
        </div>
      </form>
    </div>
  )
}

function F({
  label, name, defaultValue = '', required = false, note,
}: {
  label: string; name: string; defaultValue?: string; required?: boolean; note?: string
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
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300"
      />
    </div>
  )
}

function TA({
  label, name, defaultValue = '', required = false, rows = 3,
}: {
  label: string; name: string; defaultValue?: string; required?: boolean; rows?: number
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <textarea
        name={name}
        defaultValue={defaultValue}
        required={required}
        rows={rows}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300"
      />
    </div>
  )
}
