import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/lucia'
import { prisma } from '@/lib/prisma'

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  RESOURCE_CREATE:  { label: 'Creó',           color: 'bg-caribe/10 text-caribe' },
  RESOURCE_UPDATE:  { label: 'Editó',          color: 'bg-gray-100 text-gray-600' },
  RESOURCE_CONFIRM: { label: 'Confirmó',       color: 'bg-orange-100 text-orange-700' },
  RESOURCE_PUBLISH: { label: 'Publicó',        color: 'bg-green-100 text-green-700' },
  RESOURCE_ARCHIVE: { label: 'Archivó',        color: 'bg-amber-100 text-amber-700' },
  USER_INVITE:      { label: 'Invitó usuario', color: 'bg-purple-100 text-purple-700' },
  USER_UPDATE:      { label: 'Editó usuario',  color: 'bg-gray-100 text-gray-600' },
  USER_DELETE:      { label: 'Eliminó usuario',color: 'bg-red-100 text-red-600' },
  COUNTRY_CREATE:   { label: 'Creó país',      color: 'bg-selva/10 text-selva' },
  COUNTRY_UPDATE:   { label: 'Editó país',     color: 'bg-gray-100 text-gray-600' },
}

function timeAgo(date: Date) {
  const diff = Date.now() - date.getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'ahora'
  if (mins < 60) return `hace ${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `hace ${hrs}h`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `hace ${days}d`
  return new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short' }).format(date)
}

export default async function ActivityPage() {
  const { user } = await getSession()
  if (!user) redirect('/admin/login')

  const where = user.role === 'EDITOR'
    ? { countrySlug: { in: user.countrySlugs } }
    : {}

  const logs = await prisma.auditLog.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 200,
  })

  return (
    <div className="max-w-3xl">
      <nav className="flex items-center gap-2 mb-6 text-sm">
        <Link href="/admin" className="text-gray-400 hover:text-gray-700">Inicio</Link>
        <span className="text-gray-300">/</span>
        <span className="text-gray-900 font-medium">Actividad</span>
      </nav>

      <h1 className="text-xl font-bold text-gray-900 mb-6">Registro de actividad</h1>

      {logs.length === 0 ? (
        <p className="text-sm text-gray-400 py-12 text-center">Sin actividad registrada aún.</p>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden divide-y divide-gray-100">
          {logs.map(log => {
            const meta = ACTION_LABELS[log.action] ?? { label: log.action, color: 'bg-gray-100 text-gray-500' }
            return (
              <div key={log.id} className="flex items-start gap-4 px-5 py-3.5">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-gray-900 truncate">{log.userEmail}</span>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${meta.color}`}>
                      {meta.label}
                    </span>
                    {log.entityName && (
                      <span className="text-sm text-gray-600 truncate">
                        {log.entityType === 'resource' && log.entityId ? (
                          <Link
                            href={`/admin/${log.countrySlug}/${log.entityId}`}
                            className="hover:underline"
                          >
                            {log.entityName}
                          </Link>
                        ) : (
                          log.entityName
                        )}
                      </span>
                    )}
                  </div>
                  {log.action === 'RESOURCE_DELETE' && log.detail ? (
                    <details className="mt-0.5">
                      <summary className="text-xs text-gray-400 cursor-pointer select-none hover:text-gray-600">
                        {log.countrySlug ? `${log.countrySlug} · ` : ''}Ver recurso eliminado
                      </summary>
                      <pre className="text-xs text-gray-500 bg-gray-50 border border-gray-100 rounded-lg p-3 mt-1 overflow-x-auto whitespace-pre-wrap break-words">
                        {log.detail}
                      </pre>
                    </details>
                  ) : (
                    (log.countrySlug || log.detail) && (
                      <p className="text-xs text-gray-400 mt-0.5">
                        {[log.countrySlug, log.detail].filter(Boolean).join(' · ')}
                      </p>
                    )
                  )}
                </div>
                <time className="text-xs text-gray-400 shrink-0 pt-0.5" title={log.createdAt.toISOString()}>
                  {timeAgo(log.createdAt)}
                </time>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
