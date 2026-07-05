import { useTranslations, useLocale } from 'next-intl'
import Link from 'next/link'

export function AppFooter() {
  const t = useTranslations()
  const locale = useLocale()

  return (
    <footer className="border-t border-black/[0.08] px-5 py-6 flex flex-col items-center gap-3 text-center">
      <p className="font-sans font-light text-xs text-[#808080] leading-relaxed max-w-sm">
        {t('disclaimer')}
      </p>
      <p className="font-sans font-light text-xs text-[#808080] flex items-center gap-3">
        <Link href={`/${locale}/sobre`} className="hover:text-[#141414] transition-colors">
          {t('footer.about')}
        </Link>
        <span className="text-[#d0d0d0]">·</span>
        <Link href={`/${locale}/noticias`} className="hover:text-[#141414] transition-colors">
          {t('footer.news')}
        </Link>
      </p>
      <p className="font-sans font-light text-xs text-[#b8b8b8]">
        {t('footer.cta')}{' '}
        <a
          href="mailto:veconecta.org@gmail.com"
          className="underline underline-offset-2 hover:text-[#808080] transition-colors"
        >
          veconecta.org@gmail.com
        </a>
      </p>
    </footer>
  )
}
