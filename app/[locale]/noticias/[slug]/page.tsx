import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { prisma } from '@/lib/prisma'
import { localizeBare, INTL_LOCALE, type Locale } from '@/lib/locale-content'
import type { Metadata } from 'next'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>
}): Promise<Metadata> {
  const { locale, slug } = await params
  const post = await prisma.post.findUnique({ where: { slug, status: 'PUBLISHED' } })
  if (!post) return {}
  const title = localizeBare(post, 'title', locale)
  return {
    title: `${title} | VEconecta`,
    openGraph: {
      type: 'website',
      siteName: 'VEconecta',
      title: `${title} | VEconecta`,
      images: post.imageUrl
        ? [{ url: post.imageUrl, width: 1200, height: 630 }]
        : [{ url: `/api/og?locale=${locale}`, width: 1200, height: 630 }],
    },
  }
}

export default async function NoticiaDetailPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>
}) {
  const { locale, slug } = await params
  setRequestLocale(locale)
  const t = await getTranslations('updates')
  const tNav = await getTranslations('nav')

  const post = await prisma.post.findUnique({ where: { slug, status: 'PUBLISHED' } })
  if (!post) notFound()

  const intlLocale = INTL_LOCALE[locale as Locale] ?? INTL_LOCALE.es
  const fmt = (date: Date) =>
    new Intl.DateTimeFormat(intlLocale, { day: 'numeric', month: 'short', year: 'numeric' }).format(date)

  const title = localizeBare(post, 'title', locale)
  const body = localizeBare(post, 'body', locale)

  return (
    <main className="min-h-screen bg-white px-5 pt-8 pb-10">
      <nav className="flex items-center gap-1.5 mb-6 text-sm">
        <Link href={`/${locale}`} className="text-caribe hover:underline">
          {tNav('home')}
        </Link>
        <span className="text-[#b8b8b8]">›</span>
        <Link href={`/${locale}/noticias`} className="text-caribe hover:underline">
          {t('title')}
        </Link>
      </nav>

      <h1 className="font-display font-extrabold text-[24px] leading-[1.15] tracking-[-0.01em] text-[#141414] mb-1.5">
        {title}
      </h1>
      {post.publishedAt && (
        <p className="font-sans font-light text-[13px] text-[#808080] mb-6">
          {t('publishedOn', { date: fmt(post.publishedAt) })}
        </p>
      )}

      {post.imageUrl && (
        <img
          src={post.imageUrl}
          alt=""
          className="w-full aspect-video object-cover rounded-xl mb-6"
        />
      )}

      <div className="space-y-4 font-sans font-light text-[15px] text-[#141414] leading-relaxed whitespace-pre-line">
        {body}
      </div>

      <Link
        href={`/${locale}/noticias`}
        className="inline-block mt-8 font-sans text-[14px] text-caribe hover:underline"
      >
        ← {t('backToList')}
      </Link>
    </main>
  )
}
