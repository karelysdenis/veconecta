import { notFound, redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/lucia'
import { ResourceStatus } from '@prisma/client'
import { revalidatePath } from 'next/cache'
import Link from 'next/link'

export default async function AdminCountryPage({
  params,
}: {
  params: Promise<{ country: string }>
}) {
  const { country } = await params
  const { user } = await getSession()
  if (!user) redirect('/admin/login')

  // EDITOR can only access their assigned country
  if (user.role === 'EDITOR' && user.countrySlug !== country) {
    redirect('/admin')
  }

  const countryRecord = await prisma.country.findUnique({
    where: { slug: country },
    include: {
      resources: {
        where: { status: { not: ResourceStatus.ARCHIVED } },
        orderBy: [{ status: 'asc' }, { category: 'asc' }, { createdAt: 'asc' }],
      },
    },
  })

  if (!countryRecord) notFound()

  const drafts = countryRecord.resources.filter((r) => r.status === 'DRAFT')
  const published = countryRecord.resources.filter((r) => r.status === 'PUBLISHED')

  async function publishResource(formData: FormData) {
    'use server'
    const id = formData.get('id') as string
    const { user } = await getSession()
    if (!user || user.role !== 'ADMIN') return
    const now = new Date()
    await prisma.resource.update({
      where: { id },
      data: {
        status: 'PUBLISHED',
        verifiedAt: now,
        verifiedBy: user.email,
        expiresAt: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000),
      },
    })
    revalidatePath(`/es/${country}`)
    revalidatePath(`/en/${country}`)
    revalidatePath(`/pt/${country}`)
    revalidatePath('/admin')
  }

  async function archiveResource(formData: FormData) {
    'use server'
    const id = formData.get('id') as string
    const { user } = await getSession()
    if (!user || user.role !== 'ADMIN') return
    await prisma.resource.update({ where: { id }, data: { status: 'ARCHIVED' } })
    revalidatePath(`/es/${country}`)
    revalidatePath(`/en/${country}`)
    revalidatePath(`/pt/${country}`)
    revalidatePath('/admin')
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{countryRecord.flag}</span>
          <h1 className="text-xl font-bold text-gray-900">{countryRecord.nameEs}</h1>
        </div>
        {user.role === 'ADMIN' && (
          <Link
            href={`/admin/${country}/new`}
            className="text-sm bg-gray-900 text-white px-4 py-2 rounded-lg hover:bg-gray-700"
          >
            + Añadir recurso
          </Link>
        )}
      </div>

      {drafts.length > 0 && (
        <section>
          <h2 className="text-base font-semibold text-amber-700 mb-3">
            Borradores ({drafts.length})
          </h2>
          <div className="space-y-2">
            {drafts.map((r) => (
              <div
                key={r.id}
                className="bg-white border border-amber-200 rounded-lg p-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-xs text-gray-500 uppercase">{r.category}</span>
                    <p className="font-medium text-sm text-gray-900">{r.name}</p>
                    {r.notesEs && (
                      <p className="text-xs text-gray-600 mt-0.5">{r.notesEs}</p>
                    )}
                    {r.url && <p className="text-xs text-blue-600">{r.url}</p>}
                  </div>
                  {user.role === 'ADMIN' && (
                    <div className="flex gap-2 shrink-0">
                      <Link
                        href={`/admin/${country}/${r.id}`}
                        className="text-xs border border-gray-300 text-gray-600 px-3 py-1 rounded hover:bg-gray-50"
                      >
                        Editar
                      </Link>
                      <form action={publishResource}>
                        <input type="hidden" name="id" value={r.id} />
                        <button
                          type="submit"
                          className="text-xs bg-green-700 text-white px-3 py-1 rounded"
                        >
                          Publicar
                        </button>
                      </form>
                      <form action={archiveResource}>
                        <input type="hidden" name="id" value={r.id} />
                        <button
                          type="submit"
                          className="text-xs border border-gray-300 text-gray-600 px-3 py-1 rounded"
                        >
                          Archivar
                        </button>
                      </form>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="text-base font-semibold text-green-700 mb-3">
          Publicados ({published.length})
        </h2>
        <div className="space-y-2">
          {published.map((r) => (
            <div
              key={r.id}
              className="bg-white border border-green-200 rounded-lg p-4"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-xs text-gray-500 uppercase">{r.category}</span>
                  <p className="font-medium text-sm text-gray-900">{r.name}</p>
                  {r.verifiedAt && (
                    <p className="text-xs text-gray-500 mt-0.5">
                      Verificado:{' '}
                      {new Intl.DateTimeFormat('es-ES').format(r.verifiedAt)} por{' '}
                      {r.verifiedBy}
                    </p>
                  )}
                </div>
                {user.role === 'ADMIN' && (
                  <div className="flex gap-2 shrink-0">
                    <Link
                      href={`/admin/${country}/${r.id}`}
                      className="text-xs text-gray-400 hover:text-gray-600 underline"
                    >
                      Editar
                    </Link>
                    <form action={archiveResource}>
                      <input type="hidden" name="id" value={r.id} />
                      <button
                        type="submit"
                        className="text-xs text-gray-400 hover:text-gray-600 underline"
                      >
                        Archivar
                      </button>
                    </form>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
