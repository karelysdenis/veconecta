'use client'

import { useActionState } from 'react'
import { previewImportAction, confirmImportAction, type PreviewState } from '@/app/admin/(dashboard)/import/actions'

const CATEGORY_LABELS: Record<string, string> = {
  FIND_FAMILY: 'Encontrar familia',
  DONATE_MONEY: 'Donar dinero',
  SEND_MONEY: 'Enviar dinero',
  CALL_FREE: 'Llamada gratuita',
  DONATE_PHYSICALLY: 'Donación física',
  DIGITAL_BRIDGE: 'Puente digital',
  CONSULAR: 'Consular',
  MENTAL_HEALTH: 'Salud mental',
}

const initialState: PreviewState = { preview: null, error: null }

export function ImportForm({ role }: { role: 'ADMIN' | 'EDITOR' }) {
  const [state, formAction, isPending] = useActionState(previewImportAction, initialState)
  const preview = state.preview

  return (
    <div className="space-y-6">
      <form action={formAction} className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Archivo del PM tracker (.xlsx)
          </label>
          <input
            type="file"
            name="file"
            accept=".xlsx"
            required
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />
        </div>
        {state.error && <p className="text-sm text-red-600">{state.error}</p>}
        <button
          type="submit"
          disabled={isPending}
          className="bg-red-700 text-white text-sm font-medium px-5 py-2 rounded-lg hover:bg-red-800 disabled:opacity-50"
        >
          {isPending ? 'Leyendo…' : 'Vista previa'}
        </button>
      </form>

      {preview && (
        <div className="space-y-4">
          {preview.internalNotesWarningCount > 0 && (
            <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              {preview.internalNotesWarningCount} fila(s) tienen Notas internas/Prioridad que no se importan — revísalas en el Excel.
            </p>
          )}

          <PreviewSection title={`✅ A crear (${preview.toCreate.length})`}>
            <ul className="divide-y divide-gray-100">
              {preview.toCreate.map((r) => (
                <li key={r.rowNumber} className="py-2 text-sm">
                  <span className="font-medium text-gray-900">{r.name}</span>{' '}
                  <span className="text-gray-500">
                    — {r.countrySlug}
                    {r.countryIsNew && ' (país nuevo)'}
                    {r.cityName && ` · ${r.cityName}${r.cityIsNew ? ' (ciudad nueva)' : ''}`}
                    {' · '}
                    {CATEGORY_LABELS[r.category] ?? r.category}
                  </span>
                </li>
              ))}
            </ul>
          </PreviewSection>

          {preview.duplicates.length > 0 && (
            <PreviewSection title={`⏭️ Ya importadas, se omiten (${preview.duplicates.length})`}>
              <ul className="divide-y divide-gray-100">
                {preview.duplicates.map((r) => (
                  <li key={r.rowNumber} className="py-2 text-sm text-gray-500">
                    {r.name} — {r.countrySlug}
                  </li>
                ))}
              </ul>
            </PreviewSection>
          )}

          {preview.outOfScope.length > 0 && (
            <PreviewSection title={`🚫 Fuera de tu alcance (${preview.outOfScope.length})`}>
              <ul className="divide-y divide-gray-100">
                {preview.outOfScope.map((r) => (
                  <li key={r.rowNumber} className="py-2 text-sm text-gray-500">
                    {r.name} — {r.reason}
                  </li>
                ))}
              </ul>
            </PreviewSection>
          )}

          {preview.errors.length > 0 && (
            <PreviewSection title={`❌ Errores (${preview.errors.length})`}>
              <ul className="divide-y divide-gray-100">
                {preview.errors.map((r) => (
                  <li key={r.rowNumber} className="py-2 text-sm text-red-600">
                    Fila {r.rowNumber} — {r.name}: {r.reason}
                  </li>
                ))}
              </ul>
            </PreviewSection>
          )}

          {preview.toCreate.length > 0 && (
            <form action={confirmImportAction} className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
              <input type="hidden" name="toCreate" value={JSON.stringify(preview.toCreate)} />
              <input type="hidden" name="newCountries" value={JSON.stringify(preview.newCountries)} />

              {role === 'ADMIN' && preview.newCountries.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">Países nuevos a crear</p>
                  <div className="space-y-1">
                    {preview.newCountries.map((c) => (
                      <label key={c.slug} className="flex items-center gap-2 text-sm">
                        <input type="checkbox" name="confirmedNewCountrySlug" value={c.slug} defaultChecked />
                        {c.nameEs} ({c.slug})
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <button
                type="submit"
                className="bg-red-700 text-white text-sm font-medium px-5 py-2 rounded-lg hover:bg-red-800"
              >
                Confirmar import ({preview.toCreate.length})
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  )
}

function PreviewSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <p className="text-sm font-semibold text-gray-900 mb-2">{title}</p>
      {children}
    </div>
  )
}
