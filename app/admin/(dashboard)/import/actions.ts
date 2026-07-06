'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/lucia'
import { parseTrackerWorkbook } from '@/lib/import/parse-workbook'
import { resolveRows } from '@/lib/import/resolve-rows'
import { authorizeRowsForConfirm } from '@/lib/import/authorize-rows'
import { resolveOrCreateCityByName } from '@/lib/city'
import { logAction, touchCountry } from '@/lib/audit'
import { LOCALES } from '@/lib/locale-content'
import { slugify } from '@/lib/slugify'
import type { ImportPreview, NewCountryProposal, ResolvedCreate } from '@/lib/import/types'

export type PreviewState = { preview: ImportPreview | null; error: string | null }

export async function previewImportAction(_prev: PreviewState, fd: FormData): Promise<PreviewState> {
  const { user } = await getSession()
  if (!user) return { preview: null, error: 'Sesión expirada, vuelve a iniciar sesión.' }

  const file = fd.get('file') as File | null
  if (!file || file.size === 0) return { preview: null, error: 'Selecciona un archivo .xlsx.' }

  let rows
  try {
    const buffer = await file.arrayBuffer()
    rows = await parseTrackerWorkbook(buffer)
  } catch (e) {
    return { preview: null, error: e instanceof Error ? e.message : 'No se pudo leer el archivo.' }
  }

  if (rows.length === 0) return { preview: null, error: 'El archivo no tiene filas de datos.' }

  const countries = await prisma.country.findMany({ select: { slug: true, nameEs: true } })

  const existingResources = await prisma.resource.findMany({ select: { countrySlug: true, name: true } })
  const existingResourceNames = new Map<string, Set<string>>()
  for (const r of existingResources) {
    if (!existingResourceNames.has(r.countrySlug)) existingResourceNames.set(r.countrySlug, new Set())
    existingResourceNames.get(r.countrySlug)!.add(r.name)
  }

  const existingCities = await prisma.city.findMany({ select: { countrySlug: true, nameEs: true } })
  const existingCityNames = new Map<string, Set<string>>()
  for (const c of existingCities) {
    if (!existingCityNames.has(c.countrySlug)) existingCityNames.set(c.countrySlug, new Set())
    existingCityNames.get(c.countrySlug)!.add(slugify(c.nameEs))
  }

  const preview = resolveRows(rows, {
    countries,
    existingResourceNames,
    existingCityNames,
    userRole: user.role,
    editorCountrySlugs: user.countrySlugs,
  })

  return { preview, error: null }
}

export async function confirmImportAction(fd: FormData) {
  const { user } = await getSession()
  if (!user) redirect('/admin/login')

  const toCreate = JSON.parse((fd.get('toCreate') as string) || '[]') as ResolvedCreate[]
  const newCountries = JSON.parse((fd.get('newCountries') as string) || '[]') as NewCountryProposal[]
  const confirmedNewCountrySlugs = fd.getAll('confirmedNewCountrySlug') as string[]

  const authorized = authorizeRowsForConfirm(toCreate, {
    userRole: user.role,
    editorCountrySlugs: user.countrySlugs,
    confirmedNewCountrySlugs,
    newCountrySlugs: newCountries.map((c) => c.slug),
  })

  if (authorized.length === 0) redirect('/admin/import')

  const affectedCountrySlugs = new Set<string>()
  let createdCount = 0

  await prisma.$transaction(async (tx) => {
    if (user.role === 'ADMIN') {
      for (const proposal of newCountries) {
        if (!confirmedNewCountrySlugs.includes(proposal.slug)) continue
        await tx.country.upsert({
          where: { slug: proposal.slug },
          update: {},
          create: {
            slug: proposal.slug,
            nameEs: proposal.nameEs,
            nameEn: proposal.nameEs,
            flag: '🏳️',
            cca2: proposal.cca2,
            active: false,
          },
        })
      }
    }

    const cityIdCache = new Map<string, string>()

    for (const row of authorized) {
      // Re-check against the DB inside the transaction: the preview's duplicate
      // check ran against a snapshot that may be stale by the time this commits
      // (double-click, resubmitted preview, a concurrent import of the same file).
      const alreadyExists = await tx.resource.findFirst({
        where: { countrySlug: row.countrySlug, name: row.name },
        select: { id: true },
      })
      if (alreadyExists) continue

      let cityId: string | null = null
      if (row.cityName) {
        const cacheKey = `${row.countrySlug}::${row.cityName.toLowerCase()}`
        if (cityIdCache.has(cacheKey)) {
          cityId = cityIdCache.get(cacheKey)!
        } else {
          cityId = await resolveOrCreateCityByName(row.countrySlug, row.cityName, tx)
          cityIdCache.set(cacheKey, cityId)
        }
      }

      await tx.resource.create({
        data: {
          countrySlug: row.countrySlug,
          category: row.category,
          name: row.name,
          nameEn: row.nameEn,
          namePt: row.namePt,
          nameFr: row.nameFr,
          nameDe: row.nameDe,
          cityId,
          url: row.url,
          phone: row.phone,
          paymentKey: row.paymentKey,
          address: row.address,
          schedule: row.schedule,
          free: row.free,
          notesEs: row.notesEs,
          notesEn: row.notesEn,
          notesPt: row.notesPt,
          notesFr: row.notesFr,
          notesDe: row.notesDe,
          status: 'DRAFT',
          kind: 'PERMANENT',
          verifiedAt: null,
          verifiedBy: null,
          validUntil: row.validUntil ? new Date(row.validUntil) : null,
        },
      })
      createdCount++
      affectedCountrySlugs.add(row.countrySlug)
    }
  }, { timeout: 30_000 })

  if (createdCount === 0) redirect('/admin/import')

  await logAction({
    userEmail: user.email,
    action: 'RESOURCE_BULK_IMPORT',
    entityType: 'resource',
    detail: `Importados ${createdCount} recursos DRAFT desde PM tracker (países: ${[...affectedCountrySlugs].join(', ')})`,
  })

  for (const slug of affectedCountrySlugs) {
    await touchCountry(slug)
    revalidatePath(`/admin/${slug}`)
    for (const l of LOCALES) revalidatePath(`/${l}/${slug}`)
  }
  revalidatePath('/admin')

  redirect(`/admin/import?success=${createdCount}`)
}
