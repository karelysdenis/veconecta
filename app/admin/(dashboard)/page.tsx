import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/lucia'
import { revalidatePath } from 'next/cache'

export default async function AdminDashboard() {
  const { user } = await getSession()

  const countries = await prisma.country.findMany({
    where:
      user!.role === 'EDITOR' && user!.countrySlug
        ? { slug: user!.countrySlug }
        : {},
    include: {
      _count: {
        select: {
          resources: { where: { status: 'DRAFT' } },
        },
      },
    },
    orderBy: { slug: 'asc' },
  })

  const reports = await prisma.communityReport.findMany({
    where: {
      resolved: false,
      ...(user!.role === 'EDITOR' && user!.countrySlug
        ? { countrySlug: user!.countrySlug }
        : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: 20,
  })

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-bold text-gray-900 mb-4">Países</h1>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {countries.map((country) => (
            <Link
              key={country.slug}
              href={`/admin/${country.slug}`}
              className="border border-gray-200 rounded-lg p-4 hover:border-red-300 hover:bg-red-50 transition-colors"
            >
              <div className="text-2xl mb-1">{country.flag}</div>
              <div className="text-sm font-medium text-gray-900">{country.nameEs}</div>
              {country._count.resources > 0 && (
                <div className="text-xs text-amber-700 mt-1">
                  {country._count.resources} borrador
                  {country._count.resources !== 1 ? 'es' : ''}
                </div>
              )}
            </Link>
          ))}
        </div>
      </div>

      {reports.length > 0 && (
        <div>
          <h2 className="text-lg font-bold text-gray-900 mb-3">
            Reportes de la comunidad
          </h2>
          <div className="space-y-2">
            {reports.map((report) => (
              <div
                key={report.id}
                className="bg-white border border-gray-200 rounded-lg p-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-xs text-gray-500 uppercase">
                      {report.countrySlug}
                    </span>
                    <p className="text-sm text-gray-900 mt-0.5">{report.message}</p>
                    {report.url && (
                      <a
                        href={report.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 underline mt-0.5 block"
                      >
                        {report.url}
                      </a>
                    )}
                    <p className="text-xs text-gray-400 mt-1">
                      {new Intl.DateTimeFormat('es-ES', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      }).format(report.createdAt)}
                    </p>
                  </div>
                  <ResolveButton reportId={report.id} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function ResolveButton({ reportId }: { reportId: string }) {
  async function resolve() {
    'use server'
    await prisma.communityReport.update({
      where: { id: reportId },
      data: { resolved: true },
    })
    revalidatePath('/admin')
  }

  return (
    <form action={resolve}>
      <button
        type="submit"
        className="text-xs text-gray-500 hover:text-gray-700 underline shrink-0"
      >
        Resolver
      </button>
    </form>
  )
}
