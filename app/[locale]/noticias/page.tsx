import Link from 'next/link'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { prisma } from '@/lib/prisma'
import { localizeBare, INTL_LOCALE, type Locale } from '@/lib/locale-content'
import type { Metadata } from 'next'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const isEn = locale === 'en'
  return {
    title: isEn ? 'News | VEconecta' : 'Noticias | VEconecta',
    openGraph: {
      type: 'website',
      siteName: 'VEconecta',
      images: [{ url: `/api/og?locale=${locale}`, width: 1200, height: 630 }],
    },
  }
}

function excerpt(body: string): string {
  const firstParagraph = body.split('\n\n')[0]
  return firstParagraph.length > 180 ? firstParagraph.slice(0, 180).trimEnd() + '…' : firstParagraph
}

export default async function NoticiasPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('updates')
  const tNav = await getTranslations('nav')

  const posts = await prisma.post.findMany({
    where: { status: 'PUBLISHED' },
    orderBy: { publishedAt: 'desc' },
  })

  const intlLocale = INTL_LOCALE[locale as Locale] ?? INTL_LOCALE.es
  const fmt = (date: Date) =>
    new Intl.DateTimeFormat(intlLocale, { day: 'numeric', month: 'short', year: 'numeric' }).format(date)

  return (
    <main className="min-h-screen bg-white px-5 pt-8 pb-10">
      <nav className="flex items-center gap-1.5 mb-6 text-sm">
        <Link href={`/${locale}`} className="text-caribe hover:underline">
          {tNav('home')}
        </Link>
        <span className="text-[#b8b8b8]">›</span>
        <span className="text-[#141414]">{t('title')}</span>
      </nav>

      <h1 className="font-display font-extrabold text-[24px] leading-[1.15] tracking-[-0.01em] text-[#141414] mb-6">
        {t('title')}
      </h1>

      {posts.length === 0 ? (
        <p className="font-sans font-light text-[15px] text-[#808080]">{t('empty')}</p>
      ) : (
        <div className="divide-y divide-[rgba(20,20,20,0.08)] border-t border-[rgba(20,20,20,0.08)]">
          {posts.map((post) => (
            <Link
              key={post.id}
              href={`/${locale}/noticias/${post.slug}`}
              className="block py-5 hover:bg-guacamaya/5 transition-colors -mx-5 px-5"
            >
              {post.imageUrl && (
                <img
                  src={post.imageUrl}
                  alt=""
                  className="w-full aspect-video object-cover rounded-lg mb-3"
                />
              )}
              <p className="font-sans font-light text-[13px] text-[#808080] mb-1">
                {post.publishedAt ? fmt(post.publishedAt) : ''}
              </p>
              <h2 className="font-display font-bold text-[17px] text-[#141414] mb-1.5">
                {localizeBare(post, 'title', locale)}
              </h2>
              <p className="font-sans font-light text-[14px] text-[#141414]/80 leading-relaxed">
                {excerpt(localizeBare(post, 'body', locale))}
              </p>
            </Link>
          ))}
        </div>
      )}
    </main>
  )
}
