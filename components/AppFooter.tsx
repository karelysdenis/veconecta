import { getTranslations, getLocale } from 'next-intl/server'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { isCountryVisibleInLocale, localizeSuffixed } from '@/lib/locale-content'
import { SuggestionModal } from '@/components/SuggestionModal'

export async function AppFooter() {
  const t = await getTranslations()
  const locale = await getLocale()

  const countries = await prisma.country.findMany({
    where: { active: true },
    select: {
      slug: true,
      nameEs: true, nameEn: true, namePt: true, nameFr: true, nameDe: true,
      enabledLocales: true,
    },
    orderBy: { slug: 'asc' },
  })
  const countryOptions = countries
    .filter(c => isCountryVisibleInLocale(c.enabledLocales, locale))
    .map(c => ({ slug: c.slug, name: localizeSuffixed(c, 'name', locale) ?? c.nameEs }))

  return (
    <footer className="border-t border-black/[0.08] px-5 py-6 flex flex-col items-center gap-3 text-center">
      <p className="font-sans font-light text-xs text-[#808080] leading-relaxed max-w-sm">
        {t('disclaimer')}
      </p>
      <p className="font-sans font-light text-xs text-[#808080]">
        <Link href={`/${locale}/sobre`} className="hover:text-[#141414] transition-colors">
          {t('footer.about')}
        </Link>
      </p>
      <SuggestionModal countries={countryOptions} />
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
