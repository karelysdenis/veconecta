import Link from 'next/link'
import { LangPopover } from './LangPopover'
import { ShareButton } from './ShareButton'

export function AppHeader({ locale }: { locale: string }) {
  return (
    <header className="fixed top-0 left-0 right-0 z-40 h-11 bg-selva flex items-center px-4">
      <Link href={`/${locale}`} className="flex items-center flex-1">
        <VeConectaLogo />
      </Link>
      <div className="hidden md:flex items-center gap-4 text-coco">
        <LangPopover direction="down" />
        <ShareButton />
      </div>
    </header>
  )
}

function VeConectaLogo() {
  return (
    <span className="inline-flex items-stretch rounded-[3px] overflow-hidden leading-none select-none">
      <span className="bg-guacamaya text-white font-display font-extrabold text-sm px-2 py-[5px] tracking-tight">
        VE
      </span>
      <span className="bg-coco text-selva font-display font-light text-sm px-2 py-[5px] tracking-tight">
        conecta
      </span>
    </span>
  )
}
