import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/lucia'
import { prisma } from '@/lib/prisma'

export default async function UpdatesPage() {
  const { user } = await getSession()
  if (!user) redirect('/admin/login')
  if (user.role !== 'ADMIN') redirect('/admin')

  const posts = await prisma.post.findMany({
    orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
  })

  return (
    <div>
      <nav className="flex items-center gap-2 mb-6 text-sm">
        <Link href="/admin" className="text-gray-400 hover:text-gray-700">Inicio</Link>
        <span className="text-gray-300">/</span>
        <span className="text-gray-900 font-medium">Noticias</span>
      </nav>

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-900">Noticias</h1>
        <Link
          href="/admin/updates/new"
          className="text-sm bg-gray-900 text-white px-4 py-2 rounded-lg hover:bg-gray-700"
        >
          + Nueva noticia
        </Link>
      </div>

      {posts.length === 0 ? (
        <p className="text-sm text-gray-500">Todavía no hay noticias.</p>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="grid grid-cols-[1fr_auto_auto] border-b border-gray-200 bg-gray-50 px-5 py-2.5">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Título</span>
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide text-center px-4">Estado</span>
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide text-center px-4">Slug</span>
          </div>

          {posts.map((post, i) => (
            <Link
              key={post.id}
              href={`/admin/updates/${post.id}`}
              className={`grid grid-cols-[1fr_auto_auto] px-5 py-3.5 items-center hover:bg-gray-50 transition-colors ${
                i < posts.length - 1 ? 'border-b border-gray-100' : ''
              }`}
            >
              <span className="text-sm text-gray-900 truncate">{post.title}</span>
              <div className="px-4 text-center">
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                  post.status === 'PUBLISHED'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-600'
                }`}>
                  {post.status === 'PUBLISHED' ? 'Publicado' : 'Borrador'}
                </span>
              </div>
              <span className="px-4 text-center text-xs text-gray-300 font-mono">{post.slug}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
