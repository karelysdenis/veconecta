import { useTranslations } from 'next-intl'

export function AppFooter() {
  const t = useTranslations()

  return (
    <footer className="border-t border-black/[0.08] px-5 py-6 space-y-3">
      <p className="font-sans font-light text-xs text-[#808080] leading-relaxed">
        {t('disclaimer')}
      </p>
      <a
        href="mailto:veconecta.org@gmail.com"
        className="font-sans font-light text-xs text-[#b8b8b8] underline underline-offset-2 hover:text-[#808080] transition-colors"
      >
        veconecta.org@gmail.com
      </a>
    </footer>
  )
}
