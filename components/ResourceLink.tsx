import Link from 'next/link'
import type { SerializedResource } from '@/lib/types'

export function ResourceLink({
  resource,
  locale,
}: {
  resource: SerializedResource
  locale: 'es' | 'en' | 'pt'
}) {
  return (
    <Link
      href={`/${locale}/recursos/${resource.id}`}
      className="flex items-center justify-between h-14 px-5 border-t border-[rgba(20,20,20,0.08)] hover:bg-guacamaya/5 transition-colors"
    >
      <span className="font-sans font-normal text-[15px] text-[#141414] leading-snug">
        {resource.name}
      </span>
      <span className="text-[#b8b8b8] text-base shrink-0 ml-3 select-none">›</span>
    </Link>
  )
}
