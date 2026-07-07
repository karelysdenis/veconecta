import { describe, it, expect } from 'vitest'
import { splitPhonePayment } from '@/lib/import/phone-split'

describe('splitPhonePayment', () => {
  it('returns nulls for empty input', () => {
    expect(splitPhonePayment(null)).toEqual({ phone: null, paymentKey: null })
    expect(splitPhonePayment('  ')).toEqual({ phone: null, paymentKey: null })
  })

  it('sends a plain phone number to phone', () => {
    expect(splitPhonePayment('+33 7 49 42 34 25')).toEqual({
      phone: '+33 7 49 42 34 25',
      paymentKey: null,
    })
  })

  it('sends text containing Cuenta/PIX/Bizum to paymentKey', () => {
    expect(splitPhonePayment('Cuenta 0102-1234-5678')).toEqual({
      phone: null,
      paymentKey: 'Cuenta 0102-1234-5678',
    })
    expect(splitPhonePayment('PIX: usuario@banco.com')).toEqual({
      phone: null,
      paymentKey: 'PIX: usuario@banco.com',
    })
  })

  it('splits combined text on the | delimiter', () => {
    expect(splitPhonePayment('Tel: +34 611 222 333 | Cuenta: ES12 1234')).toEqual({
      phone: 'Tel: +34 611 222 333',
      paymentKey: 'Cuenta: ES12 1234',
    })
  })

  it('falls back to phone when no heuristic matches (conservative default)', () => {
    expect(splitPhonePayment('Instagram: @caracasbartapas')).toEqual({
      phone: 'Instagram: @caracasbartapas',
      paymentKey: null,
    })
  })
})
