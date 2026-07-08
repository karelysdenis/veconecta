import Link from 'next/link'
import { ConfirmButton } from '@/components/admin/ConfirmButton'
import { LinkStatusBadge } from '@/components/admin/LinkStatusBadge'
import type { LinkStatus } from '@/lib/link-check'
import { CATEGORY_LABELS, STATUS_LABELS, STATUS_STYLES, isToday, Flag } from '@/components/admin/resource-review-constants'

export type ReviewResource = {
  id: string
  countrySlug: string
  category: string
  status: string
  name: string
  nameEn: string | null
  namePt: string | null
  url: string | null
  phone: string | null
  paymentKey: string | null
  address: string | null
  schedule: string | null
  validUntil: Date | null
  notesEs: string | null
  free: boolean
  verifiedAt: Date | null
  city: { nameEs: string } | null
}

export function ResourceReviewCard({
  resource,
  linkStatus,
  country,
  editHref,
  confirmAction,
  archiveAction,
  confirmHiddenFields,
  archiveHiddenFields,
}: {
  resource: ReviewResource
  linkStatus: LinkStatus | 'none'
  country?: { slug: string; nameEs: string; cca2: string | null; flag: string } | null
  editHref: string
  confirmAction: (fd: FormData) => void
  archiveAction: (fd: FormData) => void
  confirmHiddenFields: Record<string, string>
  archiveHiddenFields: Record<string, string>
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
      {country && (
        <div className="flex items-center gap-2">
          <Flag cca2={country.cca2} slug={country.slug} flag={country.flag} size={20} />
          <Link
            href={`/admin/${country.slug}`}
            className="text-xs text-gray-500 hover:text-gray-700 hover:underline"
          >
            {country.nameEs}
          </Link>
        </div>
      )}

      {/* Top meta */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex gap-2 flex-wrap">
          <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded">
            {CATEGORY_LABELS[resource.category] ?? resource.category}
          </span>
          <span className={`text-xs px-2 py-1 rounded border ${STATUS_STYLES[resource.status]}`}>
            {STATUS_LABELS[resource.status] ?? resource.status}
          </span>
          {resource.city && (
            <span className="text-xs text-gray-400 bg-gray-50 px-2 py-1 rounded border border-gray-100">
              {resource.city.nameEs}
            </span>
          )}
          {resource.free && (
            <span className="text-xs text-green-700 bg-green-50 px-2 py-1 rounded border border-green-100">
              Gratuito
            </span>
          )}
        </div>
        {resource.verifiedAt ? (
          <span className="text-xs text-green-700 bg-green-50 border border-green-200 px-2 py-1 rounded shrink-0 text-right">
            <span className="block">✓ {new Intl.DateTimeFormat('es-ES').format(resource.verifiedAt)}</span>
            {isToday(resource.verifiedAt) && <span className="block font-medium">Recurso confirmado</span>}
          </span>
        ) : (
          <span className="text-xs text-orange-700 bg-orange-50 border border-orange-200 px-2 py-1 rounded shrink-0">
            Sin confirmar
          </span>
        )}
      </div>

      {/* Name */}
      <div>
        <p className="text-xl font-bold text-gray-900">{resource.name}</p>
        {resource.nameEn && (
          <p className="text-sm text-gray-400 mt-0.5">
            <span className="font-medium">EN</span> {resource.nameEn}
          </p>
        )}
        {resource.namePt && (
          <p className="text-sm text-gray-400 mt-0.5">
            <span className="font-medium">PT</span> {resource.namePt}
          </p>
        )}
      </div>

      {/* URL */}
      {resource.url && (
        <div className="bg-gray-50 rounded-lg p-3 flex items-center justify-between gap-3 border border-gray-200">
          <span className="text-xs text-gray-500 truncate min-w-0">
            {resource.url.replace(/^https?:\/\//, '')}
          </span>
          <div className="flex items-center gap-2 shrink-0">
            <LinkStatusBadge status={linkStatus} />
            <a
              href={resource.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-white bg-caribe px-3 py-1.5 rounded hover:opacity-90 font-medium"
            >
              Abrir ↗
            </a>
          </div>
        </div>
      )}

      {/* Contact / location */}
      {(resource.phone || resource.paymentKey || resource.address || resource.schedule) && (
        <div className="grid grid-cols-2 gap-3 text-sm">
          {resource.phone && (
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Teléfono / WhatsApp</p>
              <p className="text-gray-700">{resource.phone}</p>
            </div>
          )}
          {resource.paymentKey && (
            <div>
              <p className="text-xs text-gray-400 mb-0.5">
                {resource.countrySlug === 'spain' ? 'Bizum' : 'Clave de pago'}
              </p>
              <p className="text-gray-700">{resource.paymentKey}</p>
            </div>
          )}
          {resource.address && (
            <div className="col-span-2">
              <p className="text-xs text-gray-400 mb-0.5">Dirección</p>
              <p className="text-gray-700">{resource.address}</p>
            </div>
          )}
          {resource.schedule && (
            <div className="col-span-2">
              <p className="text-xs text-gray-400 mb-0.5">Horario</p>
              <p className="text-gray-700">{resource.schedule}</p>
            </div>
          )}
        </div>
      )}

      {/* Fecha de fin editorial */}
      {resource.validUntil && (
        <div
          className={`text-sm font-medium px-3 py-2 rounded-lg text-center ${
            resource.validUntil < new Date()
              ? 'bg-red-50 text-red-700 border border-red-200'
              : 'bg-blue-50 text-blue-700 border border-blue-200'
          }`}
        >
          {resource.validUntil < new Date()
            ? `Venció el ${new Intl.DateTimeFormat('es-ES').format(resource.validUntil)}`
            : `Válido hasta ${new Intl.DateTimeFormat('es-ES').format(resource.validUntil)}`}
        </div>
      )}

      {/* Notes */}
      {resource.notesEs && (
        <div>
          <p className="text-xs text-gray-400 mb-1">Notas</p>
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{resource.notesEs}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 pt-2 border-t border-gray-100">
        {resource.status !== 'ARCHIVED' && (
          <ConfirmButton
            action={archiveAction}
            hiddenFields={archiveHiddenFields}
            label="Archivar"
            message={`¿Archivar "${resource.name}"?`}
            className="text-sm border border-red-200 text-red-600 px-4 py-2 rounded-lg hover:bg-red-50"
          />
        )}
        <div className="flex gap-3 ml-auto">
          <Link
            href={editHref}
            className="text-sm border border-gray-300 text-gray-600 px-4 py-2 rounded-lg hover:bg-gray-50"
          >
            Editar
          </Link>
          {!resource.verifiedAt ? (
            <form action={confirmAction}>
              {Object.entries(confirmHiddenFields).map(([k, v]) => (
                <input key={k} type="hidden" name={k} value={v} />
              ))}
              <button
                type="submit"
                className="text-sm bg-green-700 text-white px-4 py-2 rounded-lg hover:bg-green-800 font-medium"
              >
                ✓ Confirmar info
              </button>
            </form>
          ) : (
            <form action={confirmAction}>
              {Object.entries(confirmHiddenFields).map(([k, v]) => (
                <input key={k} type="hidden" name={k} value={v} />
              ))}
              <button
                type="submit"
                className="text-sm border border-green-300 text-green-700 px-4 py-2 rounded-lg hover:bg-green-50 font-medium"
              >
                ↻ Reconfirmar
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
