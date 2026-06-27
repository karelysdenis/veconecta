'use client'
import { useTranslations } from 'next-intl'
import { VerificationBadge } from './VerificationBadge'
import type { SerializedResource } from '@/lib/types'

type Locale = 'es' | 'en' | 'pt'

function getNotes(resource: SerializedResource, locale: Locale): string | null {
  if (locale === 'en') return resource.notesEn
  if (locale === 'pt') return resource.notesPt
  return resource.notesEs
}

export function ResourceLink({
  resource,
  locale,
}: {
  resource: SerializedResource
  locale: Locale
}) {
  const t = useTranslations('resource')
  const notes = getNotes(resource, locale)

  return (
    <div className="border-l-4 border-red-200 pl-3 py-2">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="font-medium text-gray-900 text-sm">{resource.name}</p>
          {notes && <p className="text-gray-600 text-xs mt-0.5">{notes}</p>}
          {resource.bizum && (
            <p className="text-gray-700 text-xs mt-0.5 font-mono">
              {t('bizum', { code: resource.bizum })}
            </p>
          )}
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <VerificationBadge verifiedAt={resource.verifiedAt} />
          <div className="flex gap-1.5">
            {resource.free && (
              <span className="text-xs text-green-700 font-medium">{t('free')}</span>
            )}
            {resource.url && (
              <a
                href={resource.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-red-700 underline font-medium"
              >
                {t('visit')}
              </a>
            )}
            {resource.phone && (
              <a
                href={`tel:${resource.phone}`}
                className="text-xs text-red-700 underline font-medium"
              >
                {t('call')}
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
