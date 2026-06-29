'use client'
import { useState, useRef } from 'react'

type ApiResult = {
  name: { common: string }
  translations: { spa?: { common: string }; por?: { common: string } }
  flag: string
  cca2: string
}

type CountryForm = {
  slug: string
  cca2: string
  flag: string
  nameEs: string
  nameEn: string
  namePt: string
}

const EMPTY: CountryForm = { slug: '', cca2: '', flag: '', nameEs: '', nameEn: '', namePt: '' }

export function CountrySearch() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<CountryForm[]>([])
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState<CountryForm>(EMPTY)
  const [open, setOpen] = useState(false)
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null)

  function field(key: keyof CountryForm) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm(f => ({ ...f, [key]: e.target.value }))
  }

  async function search(q: string) {
    if (q.length < 2) { setResults([]); setOpen(false); return }
    setLoading(true)
    try {
      const res = await fetch(
        `https://restcountries.com/v3.1/name/${encodeURIComponent(q)}?fields=name,translations,flag,cca2`,
        { signal: AbortSignal.timeout(5000) }
      )
      if (!res.ok) { setResults([]); return }
      const data: ApiResult[] = await res.json()
      setResults(
        data.slice(0, 6).map(c => ({
          slug: c.name.common.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, '-'),
          cca2: c.cca2.toLowerCase(),
          flag: c.flag,
          nameEs: c.translations?.spa?.common ?? c.name.common,
          nameEn: c.name.common,
          namePt: c.translations?.por?.common ?? c.name.common,
        }))
      )
      setOpen(true)
    } catch {
      setResults([])
    } finally {
      setLoading(false)
    }
  }

  function handleQuery(e: React.ChangeEvent<HTMLInputElement>) {
    const q = e.target.value
    setQuery(q)
    if (debounce.current) clearTimeout(debounce.current)
    debounce.current = setTimeout(() => search(q), 300)
  }

  function select(c: CountryForm) {
    setForm(c)
    setQuery('')
    setResults([])
    setOpen(false)
  }

  const flagSrc = form.cca2
    ? `https://flagcdn.com/w40/${form.cca2}.png`
    : null

  return (
    <div className="space-y-5">
      {/* Buscador */}
      <div className="relative">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Buscar país
        </label>
        <input
          type="text"
          value={query}
          onChange={handleQuery}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder="Escribe el nombre del país en cualquier idioma…"
          autoComplete="off"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300"
        />
        {loading && (
          <span className="absolute right-3 top-9 text-xs text-gray-400">Buscando…</span>
        )}
        {open && results.length > 0 && (
          <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl overflow-hidden">
            {results.map(c => (
              <button
                key={c.cca2}
                type="button"
                onMouseDown={() => select(c)}
                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 text-left"
              >
                <img
                  src={`https://flagcdn.com/w40/${c.cca2}.png`}
                  width={24}
                  height={16}
                  alt=""
                  className="object-cover rounded-sm shrink-0"
                />
                <span className="text-sm font-medium text-gray-900">{c.nameEs}</span>
                <span className="text-xs text-gray-400">{c.nameEn}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Preview bandera */}
      {flagSrc && (
        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
          <img src={flagSrc} srcSet={`https://flagcdn.com/w80/${form.cca2}.png 2x`} width={40} height={27} alt="" className="object-cover rounded" />
          <div>
            <p className="text-sm font-semibold text-gray-900">{form.nameEs}</p>
            <p className="text-xs text-gray-500">{form.nameEn} · {form.namePt}</p>
          </div>
        </div>
      )}

      {/* Campos editables */}
      <div className="grid grid-cols-2 gap-4">
        <F label="Slug (URL)" name="slug" value={form.slug} onChange={field('slug')} required placeholder="ej: colombia" note="No se puede cambiar después" />
        <F label="Código ISO" name="cca2" value={form.cca2} onChange={field('cca2')} placeholder="ej: co" note="Para mostrar la bandera" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <F label="Nombre en español" name="nameEs" value={form.nameEs} onChange={field('nameEs')} required placeholder="Colombia" />
        <F label="Nombre en inglés" name="nameEn" value={form.nameEn} onChange={field('nameEn')} required placeholder="Colombia" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <F label="Nombre en portugués" name="namePt" value={form.namePt} onChange={field('namePt')} placeholder="Colômbia" />
        <F label="Bandera (emoji)" name="flag" value={form.flag} onChange={field('flag')} placeholder="🇨🇴" />
      </div>
    </div>
  )
}

function F({
  label, name, value, onChange, required = false, placeholder = '', note,
}: {
  label: string
  name: string
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  required?: boolean
  placeholder?: string
  note?: string
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
        {note && <span className="text-xs text-gray-400 font-normal ml-1">({note})</span>}
      </label>
      <input
        type="text"
        name={name}
        value={value}
        onChange={onChange}
        required={required}
        placeholder={placeholder}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300"
      />
    </div>
  )
}
