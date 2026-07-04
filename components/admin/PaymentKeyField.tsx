'use client'
import { useEffect, useRef, useState } from 'react'

export function PaymentKeyField({
  initialCountrySlug,
  defaultValue,
}: {
  initialCountrySlug: string
  defaultValue: string
}) {
  const [countrySlug, setCountrySlug] = useState(initialCountrySlug)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const select = inputRef.current?.closest('form')?.querySelector<HTMLSelectElement>('select[name="countrySlug"]')
    if (!select) return
    const onChange = () => setCountrySlug(select.value)
    select.addEventListener('change', onChange)
    return () => select.removeEventListener('change', onChange)
  }, [])

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {countrySlug === 'spain' ? 'Bizum' : 'Clave de pago'}
      </label>
      <input
        ref={inputRef}
        type="text"
        name="paymentKey"
        defaultValue={defaultValue}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300"
      />
    </div>
  )
}
