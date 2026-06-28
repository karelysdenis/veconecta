import Link from 'next/link'
import { LangPopover } from './LangPopover'
import { ShareButton } from './ShareButton'

export function AppHeader({ locale }: { locale: string }) {
  return (
    <header className="fixed top-0 left-0 right-0 z-40 h-11 bg-red-700 flex items-center px-4">
      <Link
        href={`/${locale}`}
        className="text-white font-bold text-base flex items-center gap-1.5 flex-1"
      >
        🇻🇪 VeConecta
      </Link>

      {/* Controles solo en desktop */}
      <div className="hidden md:flex items-center gap-4 text-white">
        <LangPopover direction="down" />
        <ShareButton />
      </div>
    </header>
  )
}
