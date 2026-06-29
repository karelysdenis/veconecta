import Link from 'next/link'
import { Search } from 'lucide-react'
import { LangPopover } from './LangPopover'

export function AppHeader({ locale }: { locale: string }) {
  return (
    <header className="fixed top-0 left-0 right-0 z-40 h-14 bg-white border-b border-black/[0.08]">
      <div className="max-w-2xl mx-auto h-full flex items-center justify-between px-5">
        <Link href={`/${locale}`}>
          <VeConectaLogo />
        </Link>
        <div className="flex items-center gap-3.5 text-[#141414]">
          <Link href={`/${locale}/buscar`} className="p-0.5" aria-label="Buscar">
            <Search size={18} strokeWidth={1.5} />
          </Link>
          <LangPopover direction="down" />
        </div>
      </div>
    </header>
  )
}

function VeConectaLogo() {
  return (
    <span className="inline-flex items-stretch gap-[3px] leading-none select-none">
      <span className="bg-guacamaya text-white font-display font-extrabold text-[15px] px-[7px] py-[4px] tracking-[-0.01em]">
        VE
      </span>
      <span className="bg-caribe text-coco font-display font-normal text-[15px] px-[7px] py-[4px]">
        conecta
      </span>
    </span>
  )
}
