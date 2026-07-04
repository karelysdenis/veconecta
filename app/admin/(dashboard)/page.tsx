import { redirect } from 'next/navigation'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/lucia'
import { revalidatePath } from 'next/cache'
import { flagUrl } from '@/lib/country-iso'
import { FlagImage } from '@/components/admin/FlagImage'
import { dueForReviewFilter } from '@/lib/review-config'

function Flag({ cca2, slug, flag, size = 24 }: { cca2: string | null; slug: string; flag: string; size?: number }) {
  const src = cca2 ? `https://flagcdn.com/w40/${cca2}.png` : flagUrl(slug)
  return <FlagImage src={src} flag={flag} size={size} />
}

export default async function AdminDashboard() {
  const { user } = await getSession()
  if (!user) redirect('/admin/login')

  if (user.role === 'EDITOR' && user.countrySlugs.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-sm text-gray-500">
          Tu cuenta no tiene un país asignado.
        </p>
        <p className="text-xs text-gray-400 mt-1">
          Contacta al administrador: admin@veconecta.org
        </p>
      </div>
    )
  }

  const countries = await prisma.country.findMany({
    where: user.role === 'EDITOR' ? { slug: { in: user.countrySlugs } } : {},
    include: {
      _count: {
        select: {
          resources: { where: { status: 'DRAFT' } },
        },
      },
    },
    orderBy: { slug: 'asc' },
  })

  const pendingGroups = user.role === 'ADMIN'
    ? await prisma.resource.groupBy({
        by: ['countrySlug'],
        where: { status: 'PUBLISHED', verifiedAt: null },
        _count: { _all: true },
      })
    : []
  const pendingMap = Object.fromEntries(pendingGroups.map(g => [g.countrySlug, g._count._all]))

  const globalUrgentCount = await prisma.resource.count({
    where: {
      status: 'PUBLISHED',
      ...dueForReviewFilter(),
      ...(user.role === 'EDITOR' ? { countrySlug: { in: user.countrySlugs } } : {}),
    },
  })

  const reports = await prisma.communityReport.findMany({
    where: {
      resolved: false,
      ...(user.role === 'EDITOR' ? { countrySlug: { in: user.countrySlugs } } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: 20,
  })

  return (
    <div className="space-y-8">
      <div>
        <div className="mb-4">
          <div className="flex items-center justify-between gap-3">
            <h1 className="text-xl font-bold text-gray-900">Países</h1>
            {user.role === 'ADMIN' && (
              <Link
                href="/admin/countries/new"
                className="text-sm bg-gray-900 text-white px-4 py-2 rounded-lg hover:bg-gray-700 whitespace-nowrap shrink-0"
              >
                + País
              </Link>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2 mt-3">
            <Link
              href="/admin/review"
              className="text-sm border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 flex items-center gap-1.5 whitespace-nowrap"
            >
              Revisar
              {globalUrgentCount > 0 && (
                <span className="text-xs bg-orange-500 text-white px-1.5 py-0.5 rounded-full leading-none">
                  {globalUrgentCount}
                </span>
              )}
            </Link>
            {user.role === 'ADMIN' && (
              <>
                <Link
                  href="/admin/languages"
                  className="text-sm border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-100 whitespace-nowrap"
                >
                  Idiomas
                </Link>
                <Link
                  href="/admin/users"
                  className="text-sm border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-100 whitespace-nowrap"
                >
                  Usuarios
                </Link>
                <Link
                  href="/admin/activity"
                  className="text-sm border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-100 whitespace-nowrap"
                >
                  Logs
                </Link>
              </>
            )}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {countries.map((country) => (
            <div key={country.slug} className="relative group">
              <Link
                href={`/admin/${country.slug}`}
                className="flex items-center gap-3 h-[52px] border border-gray-200 rounded-lg px-4 pr-10 hover:border-selva transition-colors"
              >
                <Flag cca2={country.cca2} slug={country.slug} flag={country.flag} size={28} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                    <span className="text-sm font-medium text-gray-900 truncate">{country.nameEs}</span>
                    {!country.active && (
                      <span className="shrink-0 text-[10px] text-gray-400 border border-gray-200 rounded px-1 leading-4">off</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    {country._count.resources > 0 && (
                      <span className="text-[10px] text-amber-700 border border-amber-200 rounded px-1 leading-4 shrink-0">
                        {country._count.resources}
                      </span>
                    )}
                    {(pendingMap[country.slug] ?? 0) > 0 && (
                      <span className="text-[10px] text-orange-700 border border-orange-300 bg-orange-50 rounded px-1 leading-4 shrink-0">
                        {pendingMap[country.slug]} ●
                      </span>
                    )}
                  </div>
                </div>
              </Link>
              {user.role === 'ADMIN' && (
                <Link
                  href={`/admin/countries/${country.slug}`}
                  title="Configurar país"
                  className="absolute top-1/2 -translate-y-1/2 right-2 w-7 h-7 flex items-center justify-center rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 opacity-0 group-hover:opacity-100 transition-all"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                </Link>
              )}
            </div>
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
                    {(() => {
                      const c = countries.find(x => x.slug === report.countrySlug)
                      return (
                        <span className="text-xs text-gray-500 flex items-center gap-1.5">
                          {c && <Flag cca2={c.cca2} slug={c.slug} flag={c.flag} size={16} />}
                          {c?.nameEs ?? report.countrySlug}
                        </span>
                      )
                    })()}
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
    const { user } = await getSession()
    if (!user || user.role !== 'ADMIN') return
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
