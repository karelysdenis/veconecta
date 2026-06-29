import Link from 'next/link'
import { LangPopover } from './LangPopover'
import { SearchOverlay } from './SearchOverlay'

export function AppHeader({ locale }: { locale: string }) {
  return (
    <header className="fixed top-0 left-0 right-0 z-40 h-[68px] bg-white border-b border-black/[0.08]">
      <div className="max-w-2xl mx-auto h-full flex items-center justify-between px-5">
        <Link href={`/${locale}`}>
          <VeConectaLogo />
        </Link>
        <div className="flex items-center gap-3.5 text-[#141414]">
          <SearchOverlay locale={locale} />
          <LangPopover direction="down" />
        </div>
      </div>
    </header>
  )
}

function VeConectaLogo() {
  return (
    <span className="inline-flex items-stretch gap-[3px] leading-none select-none">
      <span className="bg-guacamaya text-white font-display font-extrabold text-[19px] px-[8px] py-[5px] tracking-[-0.01em]">
        VE
      </span>
      <span className="bg-caribe text-coco font-display font-normal text-[19px] px-[8px] py-[5px]">
        conecta
      </span>
    </span>
  )
}
