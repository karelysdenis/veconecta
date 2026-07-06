const PAYMENT_KEYWORDS = /cuenta|pix|bizum/i

export function splitPhonePayment(raw: string | null): { phone: string | null; paymentKey: string | null } {
  const value = raw?.trim() || ''
  if (!value) return { phone: null, paymentKey: null }

  if (value.includes('|')) {
    const parts = value.split('|').map((p) => p.trim()).filter(Boolean)
    let phone: string | null = null
    let paymentKey: string | null = null
    for (const part of parts) {
      if (PAYMENT_KEYWORDS.test(part)) {
        paymentKey = paymentKey ? `${paymentKey} | ${part}` : part
      } else {
        phone = phone ? `${phone} | ${part}` : part
      }
    }
    return { phone, paymentKey }
  }

  if (PAYMENT_KEYWORDS.test(value)) return { phone: null, paymentKey: value }
  return { phone: value, paymentKey: null }
}
