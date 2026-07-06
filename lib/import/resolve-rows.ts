import { ResourceCategory } from '@prisma/client'
import { slugify } from '../slugify'
import { SLUG_TO_ISO } from '../country-iso'
import { resolveCountrySlug } from './country-aliases'
import { splitPhonePayment } from './phone-split'
import type { TrackerRow, ResolvedCreate, ImportPreview, NewCountryProposal } from './types'

export function resolveRows(
  rows: TrackerRow[],
  ctx: {
    countries: { slug: string; nameEs: string }[]
    existingResourceNames: Map<string, Set<string>>
    existingCityNames: Map<string, Set<string>>
    userRole: 'ADMIN' | 'EDITOR'
    editorCountrySlugs: string[]
  },
): ImportPreview {
  const toCreate: ResolvedCreate[] = []
  const duplicates: ImportPreview['duplicates'] = []
  const outOfScope: ImportPreview['outOfScope'] = []
  const errors: ImportPreview['errors'] = []
  const newCountryMap = new Map<string, NewCountryProposal>()

  for (const row of rows) {
    const name = row.name.trim()
    if (!name) {
      errors.push({ rowNumber: row.rowNumber, name: '(sin nombre)', reason: 'Nombre del recurso vacío' })
      continue
    }

    const categoryRaw = row.category.trim()
    if (!Object.values(ResourceCategory).includes(categoryRaw as ResourceCategory)) {
      errors.push({ rowNumber: row.rowNumber, name, reason: `Categoría no reconocida: "${categoryRaw}"` })
      continue
    }
    const category = categoryRaw as ResourceCategory

    let countrySlug = resolveCountrySlug(row.country, ctx.countries)
    let countryIsNew = false

    if (!countrySlug) {
      const slug = slugify(row.country.trim())
      countryIsNew = true
      countrySlug = slug
      if (ctx.userRole !== 'ADMIN') {
        outOfScope.push({
          rowNumber: row.rowNumber,
          name,
          countryRaw: row.country,
          reason: `País "${row.country}" no existe todavía`,
        })
        continue
      }
      if (!newCountryMap.has(slug)) {
        newCountryMap.set(slug, { slug, nameEs: row.country.trim(), cca2: SLUG_TO_ISO[slug] ?? null })
      }
    } else if (ctx.userRole === 'EDITOR' && !ctx.editorCountrySlugs.includes(countrySlug)) {
      outOfScope.push({
        rowNumber: row.rowNumber,
        name,
        countryRaw: row.country,
        reason: `País "${row.country}" no asignado a tu cuenta`,
      })
      continue
    }

    const existingNames = ctx.existingResourceNames.get(countrySlug) ?? new Set<string>()
    if (existingNames.has(name)) {
      duplicates.push({ rowNumber: row.rowNumber, name, countrySlug })
      continue
    }

    const { phone, paymentKey } = splitPhonePayment(row.phoneRaw)
    const cityName = row.city?.trim() || null
    const cityIsNew = cityName
      ? !(ctx.existingCityNames.get(countrySlug) ?? new Set<string>()).has(cityName.toLowerCase())
      : false

    toCreate.push({
      rowNumber: row.rowNumber,
      countrySlug,
      countryIsNew,
      category,
      name,
      nameEn: row.nameEn?.trim() || null,
      namePt: row.namePt?.trim() || null,
      nameFr: row.nameFr?.trim() || null,
      nameDe: row.nameDe?.trim() || null,
      url: row.url?.trim() || null,
      phone,
      paymentKey,
      free: /^s[ií]$/i.test(row.free?.trim() || ''),
      cityName,
      cityIsNew,
      address: row.address?.trim() || null,
      schedule: row.schedule?.trim() || null,
      notesEs: row.notesEs?.trim() || null,
      notesEn: row.notesEn?.trim() || null,
      notesPt: row.notesPt?.trim() || null,
      notesFr: row.notesFr?.trim() || null,
      notesDe: row.notesDe?.trim() || null,
      validUntil: row.validUntil?.trim() || null,
    })
  }

  const internalNotesWarningCount = rows.filter(
    (r) => r.priority?.trim() || r.internalNotes?.trim(),
  ).length

  return {
    toCreate,
    duplicates,
    outOfScope,
    errors,
    newCountries: [...newCountryMap.values()],
    internalNotesWarningCount,
  }
}
