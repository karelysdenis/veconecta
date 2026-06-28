import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/lucia'
import { ResourceCategory, ResourceStatus } from '@prisma/client'
import { revalidatePath } from 'next/cache'
import Link from 'next/link'

const CATEGORIES = Object.values(ResourceCategory)

export default async function NewResourcePage({
  params,
}: {
  params: Promise<{ country: string }>
}) {
  const { country } = await params
  const { user } = await getSession()
  if (!user) redirect('/admin/login')
  if (user.role !== 'ADMIN') redirect('/admin')

  async function create(fd: FormData) {
    'use server'
    const { user } = await getSession()
    if (!user || user.role !== 'ADMIN') return
    const expiresRaw = fd.get('expiresAt') as string
    await prisma.resource.create({
      data: {
        countrySlug: country,
        name: (fd.get('name') as string).trim(),
        category: fd.get('category') as ResourceCategory,
        status: ResourceStatus.DRAFT,
        url: (fd.get('url') as string).trim() || null,
        phone: (fd.get('phone') as string).trim() || null,
        bizum: (fd.get('bizum') as string).trim() || null,
        city: (fd.get('city') as string).trim() || null,
        address: (fd.get('address') as string).trim() || null,
        schedule: (fd.get('schedule') as string).trim() || null,
        free: fd.get('free') === 'on',
        notesEs: (fd.get('notesEs') as string).trim() || null,
        notesEn: (fd.get('notesEn') as string).trim() || null,
        expiresAt: expiresRaw ? new Date(expiresRaw) : null,
        verifiedAt: new Date(),
        verifiedBy: user.email,
      },
    })
    revalidatePath(`/admin/${country}`)
    redirect(`/admin/${country}`)
  }

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-2 mb-6 text-sm">
        <Link href={`/admin/${country}`} className="text-gray-500 hover:underline">
          ← {country}
        </Link>
        <span className="text-gray-300">/</span>
        <span className="text-gray-900 font-medium">Nuevo recurso</span>
      </div>

      <form action={create} className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
        <F label="Nombre" name="name" required />

        <div className="grid grid-cols-2 gap-4">
          <Sel label="Categoría" name="category" opts={CATEGORIES} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <F label="Ciudad" name="city" />
          <F label="Bizum" name="bizum" />
        </div>

        <F label="URL" name="url" type="url" />
        <F label="Teléfono / WhatsApp" name="phone" />
        <F label="Dirección" name="address" />
        <F label="Horario" name="schedule" />
        <F label="Vence (fecha)" name="expiresAt" type="date" />

        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" name="free" defaultChecked className="h-4 w-4 rounded" />
          <span className="text-sm text-gray-700">Gratuito</span>
        </label>

        <TA label="Notas ES" name="notesEs" />
        <TA label="Notas EN" name="notesEn" />

        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          El recurso se crea como borrador. Publícalo desde la página del país cuando esté listo.
        </p>

        <div className="flex justify-end gap-3 pt-2">
          <Link href={`/admin/${country}`} className="text-sm text-gray-600 hover:underline px-4 py-2">
            Cancelar
          </Link>
          <button
            type="submit"
            className="bg-red-700 text-white text-sm font-medium px-5 py-2 rounded-lg hover:bg-red-800"
          >
            Crear borrador
          </button>
        </div>
      </form>
    </div>
  )
}

function F({
  label, name, type = 'text', required = false,
}: {
  label: string; name: string; type?: string; required?: boolean
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        type={type}
        name={name}
        required={required}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300"
      />
    </div>
  )
}

function Sel({ label, name, opts }: { label: string; name: string; opts: string[] }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <select
        name={name}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300"
      >
        {opts.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    </div>
  )
}

function TA({ label, name }: { label: string; name: string }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <textarea
        name={name}
        rows={3}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300 resize-none"
      />
    </div>
  )
}
