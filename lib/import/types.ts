import type { ResourceCategory } from '@prisma/client'

export type TrackerRow = {
  rowNumber: number
  country: string
  category: string
  name: string
  nameEn: string | null
  namePt: string | null
  nameFr: string | null
  nameDe: string | null
  url: string | null
  phoneRaw: string | null
  free: string | null
  city: string | null
  address: string | null
  schedule: string | null
  notesEs: string | null
  notesEn: string | null
  notesPt: string | null
  notesFr: string | null
  notesDe: string | null
  validUntil: string | null
  priority: string | null
  internalNotes: string | null
}

export type ResolvedCreate = {
  rowNumber: number
  countrySlug: string
  countryIsNew: boolean
  category: ResourceCategory
  name: string
  nameEn: string | null
  namePt: string | null
  nameFr: string | null
  nameDe: string | null
  url: string | null
  phone: string | null
  paymentKey: string | null
  free: boolean
  cityName: string | null
  cityIsNew: boolean
  address: string | null
  schedule: string | null
  notesEs: string | null
  notesEn: string | null
  notesPt: string | null
  notesFr: string | null
  notesDe: string | null
  validUntil: string | null
}

export type SkippedDuplicate = { rowNumber: number; name: string; countrySlug: string }
export type OutOfScope = { rowNumber: number; name: string; countryRaw: string; reason: string }
export type RowError = { rowNumber: number; name: string; reason: string }
export type NewCountryProposal = { slug: string; nameEs: string; cca2: string | null }

export type ImportPreview = {
  toCreate: ResolvedCreate[]
  duplicates: SkippedDuplicate[]
  outOfScope: OutOfScope[]
  errors: RowError[]
  newCountries: NewCountryProposal[]
  internalNotesWarningCount: number
}
