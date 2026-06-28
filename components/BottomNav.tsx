'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LangPopover } from './LangPopover'
import { ShareButton } from './ShareButton'

export function BottomNav({ locale }: { locale: string }) {
  const pathname = usePathname()
  const isHome = pathname === `/${locale}`

  const activeClass = 'text-red-700'
  const inactiveClass = 'text-gray-500'

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 flex"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {/* Inicio */}
      <Link
        href={`/${locale}`}
        className={`flex flex-1 flex-col items-center justify-center gap-1 py-2 text-xs ${
          isHome ? activeClass : inactiveClass
        }`}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="w-5 h-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
          />
        </svg>
        <span>Inicio</span>
      </Link>

      {/* Idioma */}
      <div
        className={`flex flex-1 flex-col items-center justify-center gap-1 py-2 text-xs ${inactiveClass}`}
      >
        <LangPopover direction="up" />
        <span>Idioma</span>
      </div>

      {/* Compartir */}
      <div
        className={`flex flex-1 flex-col items-center justify-center gap-1 py-2 text-xs ${inactiveClass}`}
      >
        <ShareButton />
        <span>Compartir</span>
      </div>
    </nav>
  )
}
