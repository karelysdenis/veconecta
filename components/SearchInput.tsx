'use client'
import { useRouter } from 'next/navigation'
import { useState, useTransition, useRef, useEffect } from 'react'
import { Search, X } from 'lucide-react'

export function SearchInput({
  placeholder,
  defaultValue,
  locale,
}: {
  placeholder: string
  defaultValue: string
  locale: string
}) {
  const [value, setValue] = useState(defaultValue)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  function handleChange(v: string) {
    setValue(v)
    if (debounce.current) clearTimeout(debounce.current)
    debounce.current = setTimeout(() => {
      startTransition(() => {
        const url = v.trim().length >= 2
          ? `/${locale}/buscar?q=${encodeURIComponent(v.trim())}`
          : `/${locale}/buscar`
        router.replace(url, { scroll: false })
      })
    }, 300)
  }

  function clear() {
    setValue('')
    router.replace(`/${locale}/buscar`, { scroll: false })
    inputRef.current?.focus()
  }

  return (
    <div className={`relative flex items-center transition-opacity${isPending ? ' opacity-60' : ''}`}>
      <Search className="absolute left-3 w-4 h-4 text-[#808080] shrink-0" strokeWidth={1.5} />
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={e => handleChange(e.target.value)}
        placeholder={placeholder}
        autoComplete="off"
        className="w-full bg-gray-100 rounded-xl pl-9 pr-9 py-2.5 text-[15px] font-sans text-[#141414] placeholder:text-[#808080] focus:outline-none focus:ring-2 focus:ring-caribe/30 [&::-webkit-search-cancel-button]:hidden"
      />
      {value && (
        <button
          type="button"
          onClick={clear}
          aria-label="Limpiar búsqueda"
          className="absolute right-3 text-[#808080] hover:text-[#141414]"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  )
}
