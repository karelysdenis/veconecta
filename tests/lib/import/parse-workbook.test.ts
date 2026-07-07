import { describe, it, expect } from 'vitest'
import ExcelJS from 'exceljs'
import { parseTrackerWorkbook } from '@/lib/import/parse-workbook'

const HEADERS = [
  'País', 'Categoría', 'Nombre del recurso', 'Nombre EN', 'Nombre PT', 'Nombre FR', 'Nombre DE',
  'URL', 'Tel / Bizum / Cuenta / PIX', 'Gratuito', 'Ciudad / Región', 'Dirección física', 'Horario',
  'Nota ES', 'Nota EN', 'Nota PT', 'Nota FR', 'Nota DE', 'Estado', 'Verificado por',
  'Fecha verificación', 'Caduca el', 'Idiomas disponibles', 'Prioridad', 'Notas internas',
]

async function buildWorkbookBuffer(dataRows: (string | null)[][]): Promise<ArrayBuffer> {
  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet('📋 Contenido por País')
  sheet.addRow(['VeConecta — Contenido por País'])
  sheet.addRow(HEADERS)
  for (const row of dataRows) sheet.addRow(row)
  return (await workbook.xlsx.writeBuffer()) as ArrayBuffer
}

function fullRow(overrides: { country?: string | null; name?: string }): (string | null)[] {
  return [
    overrides.country === undefined ? 'Francia' : overrides.country,
    'DONATE_PHYSICALLY', overrides.name ?? 'Test recurso', null, null, null, null,
    null, '+33 1 2 3', 'Sí', 'Paris', '1 Rue Test', 'Lunes a viernes',
    'Nota es', 'Nota en', null, null, null,
    'PUBLISHED', 'alguien', '2026-07-05', null, 'ES+EN', null, null,
  ]
}

describe('parseTrackerWorkbook', () => {
  it('parses a data row into a TrackerRow', async () => {
    const buffer = await buildWorkbookBuffer([fullRow({})])
    const rows = await parseTrackerWorkbook(buffer)
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({
      country: 'Francia',
      category: 'DONATE_PHYSICALLY',
      name: 'Test recurso',
      phoneRaw: '+33 1 2 3',
      free: 'Sí',
      city: 'Paris',
    })
  })

  it('skips blank rows without stopping, and keeps reading rows after them', async () => {
    const buffer = await buildWorkbookBuffer([
      fullRow({ name: 'Primero' }),
      [null],
      fullRow({ name: 'Segundo' }),
    ])
    const rows = await parseTrackerWorkbook(buffer)
    expect(rows.map((r) => r.name)).toEqual(['Primero', 'Segundo'])
  })

  it('matches the sheet regardless of its emoji/icon prefix, case, or accents', async () => {
    const workbook = new ExcelJS.Workbook()
    const sheet = workbook.addWorksheet('CONTENIDO POR PAIS')
    sheet.addRow(['título'])
    sheet.addRow(HEADERS)
    sheet.addRow(fullRow({ name: 'Sin emoji' }))
    const buffer = (await workbook.xlsx.writeBuffer()) as ArrayBuffer
    const rows = await parseTrackerWorkbook(buffer)
    expect(rows).toHaveLength(1)
    expect(rows[0].name).toBe('Sin emoji')
  })

  it('finds the header row even when País is not the first column', async () => {
    const reorderedHeaders = [HEADERS[1], HEADERS[0], ...HEADERS.slice(2)]
    const dataRow = fullRow({ name: 'Reordenado' })
    const reorderedDataRow = [dataRow[1], dataRow[0], ...dataRow.slice(2)]
    const workbook = new ExcelJS.Workbook()
    const sheet = workbook.addWorksheet('📋 Contenido por País')
    sheet.addRow(['título'])
    sheet.addRow(reorderedHeaders)
    sheet.addRow(reorderedDataRow)
    const buffer = (await workbook.xlsx.writeBuffer()) as ArrayBuffer
    const rows = await parseTrackerWorkbook(buffer)
    expect(rows).toHaveLength(1)
    expect(rows[0].name).toBe('Reordenado')
    expect(rows[0].country).toBe('Francia')
  })

  it('throws when the sheet is missing', async () => {
    const workbook = new ExcelJS.Workbook()
    workbook.addWorksheet('Otra hoja')
    const buffer = (await workbook.xlsx.writeBuffer()) as ArrayBuffer
    await expect(parseTrackerWorkbook(buffer)).rejects.toThrow('no encontrada')
  })

  it('throws when a required column is missing from the template', async () => {
    const workbook = new ExcelJS.Workbook()
    const sheet = workbook.addWorksheet('📋 Contenido por País')
    sheet.addRow(['título'])
    sheet.addRow(['País', 'Categoría'])
    const buffer = (await workbook.xlsx.writeBuffer()) as ArrayBuffer
    await expect(parseTrackerWorkbook(buffer)).rejects.toThrow('Columnas no encontradas')
  })
})
