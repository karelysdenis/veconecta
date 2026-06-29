import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/lucia'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { flagUrl } from '@/lib/country-iso'

export default async function TranslationsPage() {
  const { user } = await getSession()
  if (!user) redirect('/admin/login')
  if (user.role !== 'ADMIN') redirect('/admin')

  const resources = await prisma.resource.findMany({
    select: {
      id: true,
      name: true,
      nameEn: true,
      namePt: true,
      countrySlug: true,
      status: true,
      country: { select: { nameEs: true, flag: true, cca2: true } },
    },
    orderBy: [{ countrySlug: 'asc' }, { name: 'asc' }],
  })

  async function saveAll(fd: FormData) {
    'use server'
    const { user } = await getSession()
    if (!user || user.role !== 'ADMIN') return

    const byId: Record<string, { nameEn?: string | null; namePt?: string | null }> = {}
    for (const [key, rawValue] of fd.entries()) {
      const value = (rawValue as string).trim() || null
      if (key.startsWith('nameEn_')) {
        const id = key.slice(7)
        byId[id] = { ...byId[id], nameEn: value }
      } else if (key.startsWith('namePt_')) {
        const id = key.slice(7)
        byId[id] = { ...byId[id], namePt: value }
      }
    }

    await prisma.$transaction(
      Object.entries(byId).map(([id, data]) =>
        prisma.resource.update({ where: { id }, data })
      )
    )

    revalidatePath('/admin/translations')
    revalidatePath('/es')
    revalidatePath('/en')
    revalidatePath('/pt')
    redirect('/admin/translations')
  }

  // Group by country
  const byCountry: Record<string, typeof resources> = {}
  for (const r of resources) {
    if (!byCountry[r.countrySlug]) byCountry[r.countrySlug] = []
    byCountry[r.countrySlug].push(r)
  }

  const pending = resources.filter(r => !r.nameEn).length
  const total = resources.length

  return (
    <div>
      <nav className="flex items-center gap-2 mb-6 text-sm">
        <Link href="/admin" className="text-gray-400 hover:text-gray-700">Inicio</Link>
        <span className="text-gray-300">/</span>
        <span className="text-gray-900 font-medium">Traducciones de nombres</span>
      </nav>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Nombres por idioma</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {pending > 0
              ? <>{pending} de {total} recursos sin nombre en inglés</>
              : <>Todos los recursos tienen nombre en inglés ✓</>}
          </p>
        </div>
      </div>

      <form action={saveAll}>
        {/* Sticky save button */}
        <div className="sticky top-0 z-10 bg-gray-50 py-3 border-b border-gray-200 flex justify-end mb-6">
          <button
            type="submit"
            className="bg-red-700 text-white text-sm font-medium px-6 py-2 rounded-lg hover:bg-red-800"
          >
            Guardar cambios
          </button>
        </div>

        <div className="space-y-8">
          {Object.entries(byCountry).map(([countrySlug, items]) => {
            const country = items[0].country

            return (
              <div key={countrySlug}>
                <div className="flex items-center gap-2 mb-2">
                  {(() => { const src = country.cca2 ? `https://flagcdn.com/w40/${country.cca2}.png` : flagUrl(countrySlug); return src ? <img src={src} width={20} height={14} alt="" className="rounded-[2px] object-cover shrink-0" /> : <span className="text-base leading-none">{country.flag}</span> })()}
                  <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                    {country.nameEs}
                  </h2>
                  <span className="text-xs text-gray-400">({items.length})</span>
                </div>

                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                  {/* Table header */}
                  <div className="grid grid-cols-[2fr_2fr_2fr_auto] gap-0 border-b border-gray-200 bg-gray-50 px-4 py-2">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Español</span>
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">English</span>
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Português</span>
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Estado</span>
                  </div>

                  {/* Rows */}
                  {items.map((r, i) => (
                    <div
                      key={r.id}
                      className={`grid grid-cols-[2fr_2fr_2fr_auto] gap-0 px-4 py-3 items-center ${
                        i < items.length - 1 ? 'border-b border-gray-100' : ''
                      } ${!r.nameEn ? 'bg-amber-50/40' : ''}`}
                    >
                      <span className="text-sm text-gray-900 pr-3 leading-snug">{r.name}</span>
                      <input
                        type="text"
                        name={`nameEn_${r.id}`}
                        defaultValue={r.nameEn ?? ''}
                        placeholder="English name…"
                        className="text-sm border border-gray-200 rounded-md px-2 py-1.5 mr-3 focus:outline-none focus:ring-2 focus:ring-red-300 focus:border-transparent"
                      />
                      <input
                        type="text"
                        name={`namePt_${r.id}`}
                        defaultValue={r.namePt ?? ''}
                        placeholder="Nome em português…"
                        className="text-sm border border-gray-200 rounded-md px-2 py-1.5 mr-3 focus:outline-none focus:ring-2 focus:ring-red-300 focus:border-transparent"
                      />
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${
                        r.status === 'PUBLISHED'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-500'
                      }`}>
                        {r.status === 'PUBLISHED' ? 'pub' : 'draft'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>

        <div className="mt-6 flex justify-end">
          <button
            type="submit"
            className="bg-red-700 text-white text-sm font-medium px-6 py-2 rounded-lg hover:bg-red-800"
          >
            Guardar cambios
          </button>
        </div>
      </form>
    </div>
  )
}
