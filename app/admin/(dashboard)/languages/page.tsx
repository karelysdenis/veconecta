import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getSession } from '@/lib/lucia'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { LOCALES, LOCALE_LABELS, DEFAULT_LOCALE } from '@/lib/locale-content'
import { logAction } from '@/lib/audit'

export default async function LanguagesPage() {
  const { user } = await getSession()
  if (!user) redirect('/admin/login')
  if (user.role !== 'ADMIN') redirect('/admin')

  const rows = await prisma.locale.findMany()
  const byCode = Object.fromEntries(rows.map((r) => [r.code, r]))

  async function toggleLocale(fd: FormData) {
    'use server'
    const { user } = await getSession()
    if (!user || user.role !== 'ADMIN') return
    const code = fd.get('code') as string
    if (!code || code === DEFAULT_LOCALE) return
    const current = await prisma.locale.findUnique({ where: { code } })
    if (!current) return
    const next = !current.active
    await prisma.locale.update({ where: { code }, data: { active: next } })
    await logAction({
      userEmail: user.email,
      action: 'LOCALE_TOGGLE',
      entityType: 'locale',
      entityId: code,
      entityName: LOCALE_LABELS[code as keyof typeof LOCALE_LABELS] ?? code,
      detail: next ? 'activated' : 'deactivated',
    })
    // A locale toggle changes which routes 404/200 across the whole site.
    revalidatePath('/', 'layout')
  }

  return (
    <div className="max-w-2xl">
      <nav className="flex items-center gap-2 mb-6 text-sm">
        <Link href="/admin" className="text-gray-400 hover:text-gray-700">Inicio</Link>
        <span className="text-gray-300">/</span>
        <span className="text-gray-900 font-medium">Idiomas</span>
      </nav>

      <h1 className="text-xl font-bold text-gray-900 mb-1">Idiomas</h1>
      <p className="text-sm text-gray-500 mb-6">
        Activar o desactivar un idioma aquí no requiere desplegar: el cambio se aplica al
        instante en todo el sitio. Español no se puede desactivar.
      </p>

      <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
        {LOCALES.map((code) => {
          const active = byCode[code]?.active ?? false
          const isDefault = code === DEFAULT_LOCALE
          return (
            <div key={code} className="flex items-center justify-between px-4 py-3.5">
              <div>
                <p className="text-sm font-medium text-gray-900">{LOCALE_LABELS[code]}</p>
                <p className="text-xs text-gray-400 font-mono">{code}</p>
              </div>
              <form action={toggleLocale}>
                <input type="hidden" name="code" value={code} />
                <button
                  type="submit"
                  disabled={isDefault}
                  className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${
                    active
                      ? 'bg-green-50 text-green-700 border-green-200'
                      : 'bg-gray-50 text-gray-500 border-gray-200'
                  } ${isDefault ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-80'}`}
                >
                  {active ? 'Activo' : 'Inactivo'}
                </button>
              </form>
            </div>
          )
        })}
      </div>
    </div>
  )
}
