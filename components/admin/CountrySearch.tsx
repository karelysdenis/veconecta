'use client'
import { useState, useEffect } from 'react'

type CountryOption = {
  slug: string
  cca2: string
  flag: string
  nameEs: string
  nameEn: string
  namePt: string
}

type ApiCountry = {
  name: { common: string }
  translations: {
    spa?: { common: string }
    por?: { common: string }
  }
  flag: string
  cca2: string
}

function normalize(s: string) {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
}

function slugify(s: string) {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
}

function toOption(c: ApiCountry): CountryOption {
  return {
    slug: slugify(c.name.common),
    cca2: c.cca2.toLowerCase(),
    flag: c.flag,
    nameEs: c.translations?.spa?.common ?? c.name.common,
    nameEn: c.name.common,
    namePt: c.translations?.por?.common ?? c.name.common,
  }
}

const EMPTY: CountryOption = { slug: '', cca2: '', flag: '', nameEs: '', nameEn: '', namePt: '' }
const cache: { data: CountryOption[] | null } = { data: null }

export function CountrySearch() {
  const [query, setQuery] = useState('')
  const [all, setAll] = useState<CountryOption[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<CountryOption>(EMPTY)

  useEffect(() => {
    if (cache.data) { setAll(cache.data); return }
    setLoading(true)
    setError(false)
    fetch('/api/countries')
      .then(r => {
        if (!r.ok) throw new Error('fetch failed')
        return r.json()
      })
      .then((data: ApiCountry[]) => {
        const options = data.map(toOption).sort((a, b) =>
          a.nameEs.localeCompare(b.nameEs, 'es')
        )
        cache.data = options
        setAll(options)
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [])

  const results = query.length >= 2
    ? all.filter(c => {
        const q = normalize(query)
        return (
          normalize(c.nameEs).includes(q) ||
          normalize(c.nameEn).includes(q) ||
          normalize(c.namePt).includes(q)
        )
      }).slice(0, 7)
    : []

  function field(key: keyof CountryOption) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm(f => ({ ...f, [key]: e.target.value }))
  }

  function select(c: CountryOption) {
    setForm(c)
    setQuery('')
    setOpen(false)
  }

  const flagSrc = form.cca2 ? `https://flagcdn.com/w80/${form.cca2}.png` : null

  return (
    <div className="space-y-5">
      {/* Buscador */}
      <div className="relative">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Buscar país
          {loading && <span className="text-xs text-gray-400 font-normal ml-2">Cargando lista…</span>}
          {error && <span className="text-xs text-red-500 font-normal ml-2">Error al cargar. Rellena los campos manualmente.</span>}
        </label>
        <input
          type="text"
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => query.length >= 2 && setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder={
            loading ? 'Cargando países…'
            : error ? 'No disponible — rellena manualmente'
            : 'Escribe en español, inglés o portugués…'
          }
          disabled={loading}
          autoComplete="off"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300 disabled:bg-gray-50 disabled:text-gray-400"
        />
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
                  width={24} height={16} alt=""
                  className="object-cover rounded-sm shrink-0"
                />
                <span className="text-sm font-medium text-gray-900">{c.nameEs}</span>
                <span className="text-xs text-gray-400 ml-auto">{c.nameEn}</span>
              </button>
            ))}
          </div>
        )}
        {open && query.length >= 2 && results.length === 0 && !loading && !error && (
          <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl px-4 py-3">
            <p className="text-sm text-gray-500">Sin resultados — rellena los campos manualmente.</p>
          </div>
        )}
      </div>

      {/* Preview bandera */}
      {flagSrc && (
        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
          <img
            src={flagSrc}
            srcSet={`https://flagcdn.com/w160/${form.cca2}.png 2x`}
            width={48} height={32} alt=""
            className="object-cover rounded shadow-sm"
          />
          <div>
            <p className="text-sm font-semibold text-gray-900">{form.nameEs}</p>
            <p className="text-xs text-gray-500">{form.nameEn} · {form.namePt}</p>
          </div>
        </div>
      )}

      {/* Campos editables */}
      <div className="grid grid-cols-2 gap-4">
        <F label="Slug (URL)" name="slug" value={form.slug} onChange={field('slug')} required placeholder="ej: france" note="No cambia después" />
        <F label="Código ISO" name="cca2" value={form.cca2} onChange={field('cca2')} placeholder="ej: fr" note="Para la bandera" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <F label="Nombre en español" name="nameEs" value={form.nameEs} onChange={field('nameEs')} required placeholder="Francia" />
        <F label="Nombre en inglés" name="nameEn" value={form.nameEn} onChange={field('nameEn')} required placeholder="France" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <F label="Nombre en portugués" name="namePt" value={form.namePt} onChange={field('namePt')} placeholder="França" />
        <F label="Bandera (emoji)" name="flag" value={form.flag} onChange={field('flag')} placeholder="🇫🇷" />
      </div>
    </div>
  )
}

function F({
  label, name, value, onChange, required = false, placeholder = '', note,
}: {
  label: string; name: string; value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  required?: boolean; placeholder?: string; note?: string
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
