import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { getSession } from '@/lib/lucia'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { logAction } from '@/lib/audit'
import { LOCALES } from '@/lib/locale-content'
import { ConfirmButton } from '@/components/admin/ConfirmButton'
import { PostStatus } from '@prisma/client'

export default async function EditUpdatePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const { user } = await getSession()
  if (!user) redirect('/admin/login')
  if (user.role !== 'ADMIN') redirect('/admin')

  const post = await prisma.post.findUnique({ where: { id } })
  if (!post) notFound()

  async function save(fd: FormData) {
    'use server'
    const { user } = await getSession()
    if (!user || user.role !== 'ADMIN') return
    if (!post) return

    const slug = (fd.get('slug') as string).trim()
    const title = (fd.get('title') as string).trim()
    const titleEn = (fd.get('titleEn') as string | null)?.trim() || null
    const body = (fd.get('body') as string).trim()
    const bodyEn = (fd.get('bodyEn') as string | null)?.trim() || null
    const status = (fd.get('status') as PostStatus) || PostStatus.DRAFT
    const isFirstPublish = status === PostStatus.PUBLISHED && post.publishedAt === null

    await prisma.post.update({
      where: { id },
      data: {
        slug,
        title,
        titleEn,
        body,
        bodyEn,
        status,
        publishedAt: isFirstPublish ? new Date() : undefined,
      },
    })

    await logAction({
      userEmail: user.email,
      action: 'POST_EDIT',
      entityType: 'post',
      entityId: id,
      entityName: title,
    })

    revalidatePath('/admin/updates')
    for (const l of LOCALES) revalidatePath(`/${l}/noticias`)
    for (const l of LOCALES) revalidatePath(`/${l}/noticias/${post.slug}`)
    if (slug !== post.slug) for (const l of LOCALES) revalidatePath(`/${l}/noticias/${slug}`)
    redirect('/admin/updates')
  }

  async function deletePost() {
    'use server'
    const { user } = await getSession()
    if (!user || user.role !== 'ADMIN') return
    if (!post) return

    await prisma.post.delete({ where: { id } })

    await logAction({
      userEmail: user.email,
      action: 'POST_DELETE',
      entityType: 'post',
      entityId: id,
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
        <span className="text-gray-900 font-medium">Editar</span>
      </nav>

      <h1 className="text-xl font-bold text-gray-900 mb-6">{post.title}</h1>

      <form action={save} className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
        <F label="Slug" name="slug" defaultValue={post.slug} required />
        <F label="Título (español)" name="title" defaultValue={post.title} required />
        <F label="Título (inglés)" name="titleEn" defaultValue={post.titleEn ?? ''} />
        <TA label="Cuerpo (español)" name="body" defaultValue={post.body} required rows={8} />
        <TA label="Cuerpo (inglés)" name="bodyEn" defaultValue={post.bodyEn ?? ''} rows={8} />

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
          <select
            name="status"
            defaultValue={post.status}
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
            Guardar cambios
          </button>
        </div>
      </form>

      <div className="mt-8 bg-white border border-red-100 rounded-xl p-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-gray-900">Eliminar noticia</p>
          <p className="text-xs text-gray-500">No se puede deshacer.</p>
        </div>
        <ConfirmButton
          action={deletePost}
          label="Eliminar noticia"
          message={`¿Eliminar "${post.title}" definitivamente?`}
          confirmLabel="Sí, eliminar"
        />
      </div>
    </div>
  )
}

function F({
  label, name, defaultValue = '', required = false,
}: {
  label: string; name: string; defaultValue?: string; required?: boolean
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
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
