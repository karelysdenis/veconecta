import ExcelJS from 'exceljs'
import type { TrackerRow } from './types'

const SHEET_NAME = '📋 Contenido por País'

const COLUMN_HEADERS = {
  country: 'País',
  category: 'Categoría',
  name: 'Nombre del recurso',
  nameEn: 'Nombre EN',
  namePt: 'Nombre PT',
  nameFr: 'Nombre FR',
  nameDe: 'Nombre DE',
  url: 'URL',
  phoneRaw: 'Tel / Bizum / Cuenta / PIX',
  free: 'Gratuito',
  city: 'Ciudad / Región',
  address: 'Dirección física',
  schedule: 'Horario',
  notesEs: 'Nota ES',
  notesEn: 'Nota EN',
  notesPt: 'Nota PT',
  notesFr: 'Nota FR',
  notesDe: 'Nota DE',
  validUntil: 'Caduca el',
  priority: 'Prioridad',
  internalNotes: 'Notas internas',
} as const

type ColumnKey = keyof typeof COLUMN_HEADERS

function cellText(value: ExcelJS.CellValue): string | null {
  if (value === null || value === undefined) return null
  if (value instanceof Date) return value.toISOString()
  if (typeof value === 'object') {
    if ('richText' in value && Array.isArray((value as { richText: { text: string }[] }).richText)) {
      const text = (value as { richText: { text: string }[] }).richText.map((t) => t.text).join('')
      return text || null
    }
    if ('text' in value) return String((value as { text: unknown }).text)
  }
  const text = String(value).trim()
  return text || null
}

export async function parseTrackerWorkbook(buffer: ArrayBuffer): Promise<TrackerRow[]> {
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(buffer)

  const sheet = workbook.getWorksheet(SHEET_NAME)
  if (!sheet) throw new Error(`Hoja "${SHEET_NAME}" no encontrada en el archivo`)

  let headerRowNumber = -1
  for (let r = 1; r <= 10 && headerRowNumber === -1; r++) {
    if (cellText(sheet.getRow(r).getCell(1).value) === COLUMN_HEADERS.country) headerRowNumber = r
  }
  if (headerRowNumber === -1) {
    throw new Error(`No se encontró la fila de encabezados (columna "${COLUMN_HEADERS.country}")`)
  }

  const columnIndex: Partial<Record<ColumnKey, number>> = {}
  sheet.getRow(headerRowNumber).eachCell((cell, colNumber) => {
    const text = cellText(cell.value)
    const key = (Object.keys(COLUMN_HEADERS) as ColumnKey[]).find((k) => COLUMN_HEADERS[k] === text)
    if (key) columnIndex[key] = colNumber
  })

  const missing = (Object.keys(COLUMN_HEADERS) as ColumnKey[]).filter((k) => !columnIndex[k])
  if (missing.length > 0) {
    throw new Error(`Columnas no encontradas en la plantilla: ${missing.map((k) => COLUMN_HEADERS[k]).join(', ')}`)
  }

  const col = (key: ColumnKey) => columnIndex[key]!

  const rows: TrackerRow[] = []
  for (let r = headerRowNumber + 1; r <= sheet.rowCount; r++) {
    const row = sheet.getRow(r)
    const country = cellText(row.getCell(col('country')).value)
    if (!country) continue

    rows.push({
      rowNumber: r,
      country,
      category: cellText(row.getCell(col('category')).value) ?? '',
      name: cellText(row.getCell(col('name')).value) ?? '',
      nameEn: cellText(row.getCell(col('nameEn')).value),
      namePt: cellText(row.getCell(col('namePt')).value),
      nameFr: cellText(row.getCell(col('nameFr')).value),
      nameDe: cellText(row.getCell(col('nameDe')).value),
      url: cellText(row.getCell(col('url')).value),
      phoneRaw: cellText(row.getCell(col('phoneRaw')).value),
      free: cellText(row.getCell(col('free')).value),
      city: cellText(row.getCell(col('city')).value),
      address: cellText(row.getCell(col('address')).value),
      schedule: cellText(row.getCell(col('schedule')).value),
      notesEs: cellText(row.getCell(col('notesEs')).value),
      notesEn: cellText(row.getCell(col('notesEn')).value),
      notesPt: cellText(row.getCell(col('notesPt')).value),
      notesFr: cellText(row.getCell(col('notesFr')).value),
      notesDe: cellText(row.getCell(col('notesDe')).value),
      validUntil: cellText(row.getCell(col('validUntil')).value),
      priority: cellText(row.getCell(col('priority')).value),
      internalNotes: cellText(row.getCell(col('internalNotes')).value),
    })
  }

  return rows
}
