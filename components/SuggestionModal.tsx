'use client'
import { useState } from 'react'
import { X } from 'lucide-react'
import { useTranslations } from 'next-intl'
import type { ResourceCategory } from '@prisma/client'
import { CATEGORY_ORDER } from '@/lib/resource-categories'
import { useEscapeToClose } from '@/lib/use-escape-to-close'

type CountryOption = { slug: string; name: string }
type SuggestionType = 'INITIATIVE' | 'EVENT'

const OTHER_COUNTRY = '__other__'
const GLOBAL_COUNTRY = 'global'

// Fixed Spanish labels for the admin-facing message, independent of the
// visitor's locale — the admin dashboard is Spanish-only, so the composed
// message must not switch language just because a visitor browses in fr/de/etc.
const CATEGORY_LABELS_ES: Record<ResourceCategory, string> = {
  FIND_FAMILY: 'Buscar familiares',
  DONATE_MONEY: 'Donar dinero',
  SEND_MONEY: 'Enviar dinero a familia',
  CALL_FREE: 'Llamar gratis a Venezuela',
  DONATE_PHYSICALLY: 'Donar físicamente',
  DIGITAL_BRIDGE: 'Ser puente digital',
  CONSULAR: 'Trámites consulares',
  MENTAL_HEALTH: 'Apoyo psicológico',
}

type FormState = {
  type: SuggestionType
  category: ResourceCategory | ''
  countrySlug: string
  otherCountry: string
  name: string
  description: string
  beneficiary: string
  date: string
  schedule: string
  url: string
  details: string
}

const INITIAL_FORM: FormState = {
  type: 'INITIATIVE',
  category: '',
  countrySlug: '',
  otherCountry: '',
  name: '',
  description: '',
  beneficiary: '',
  date: '',
  schedule: '',
  url: '',
  details: '',
}

const fieldLabel = 'block font-sans font-semibold text-[11px] uppercase tracking-wide text-[#808080] mb-1.5'
const fieldInput = 'w-full font-sans text-[15px] text-[#141414] border border-[rgba(20,20,20,0.12)] rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-caribe/30 focus:border-caribe transition-colors'
// Long "e.g." examples go here instead of into the placeholder attribute:
// a single-line <input> placeholder doesn't wrap and gets clipped, and any
// placeholder disappears the moment the visitor starts typing — a caption
// stays visible and readable regardless of text length or language.
const fieldHint = 'font-sans font-light text-xs text-[#b8b8b8] mt-1'

export function SuggestionModal({ countries }: { countries: CountryOption[] }) {
  const t = useTranslations('suggestion')
  const tCat = useTranslations('categories')
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<FormState>(INITIAL_FORM)
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm(f => ({ ...f, [key]: value }))
  }

  function close() {
    setOpen(false)
    setStatus('idle')
    setForm(INITIAL_FORM)
  }

  useEscapeToClose(open, close)

  const canSubmit = Boolean(
    form.category &&
    form.name.trim() &&
    form.description.trim() &&
    form.beneficiary.trim() &&
    form.countrySlug &&
    (form.countrySlug !== OTHER_COUNTRY || form.otherCountry.trim()) &&
    (form.type === 'INITIATIVE' || form.date.trim())
  )

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    setStatus('loading')
    const typeLabel = form.type === 'EVENT' ? 'Evento' : 'Iniciativa'
    const parts = [
      `Sugerencia de ${typeLabel}: ${form.name.trim()}.`,
      `Categoría: ${CATEGORY_LABELS_ES[form.category as ResourceCategory]}.`,
      `Descripción: ${form.description.trim()}.`,
      `Beneficia a: ${form.beneficiary.trim()}.`,
    ]
    if (form.type === 'EVENT') parts.push(`Fecha: ${form.date.trim()}.`)
    if (form.schedule.trim()) parts.push(`Horario: ${form.schedule.trim()}.`)
    if (form.details.trim()) parts.push(`Detalles: ${form.details.trim()}.`)
    const finalCountrySlug = form.countrySlug === OTHER_COUNTRY ? form.otherCountry.trim() : form.countrySlug
    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          countrySlug: finalCountrySlug,
          message: parts.join(' '),
          url: form.url.trim() || undefined,
        }),
      })
      if (!res.ok) throw new Error()
      setStatus('success')
    } catch {
      setStatus('error')
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="font-sans font-semibold text-xs text-white bg-caribe px-4 py-2 rounded-full hover:bg-caribe/90 transition-colors"
      >
        {t('trigger')}
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={t('title')}
          className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
          onClick={(e) => { if (e.target === e.currentTarget) close() }}
        >
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 relative max-h-[90vh] overflow-y-auto">
            <button
              type="button"
              onClick={close}
              aria-label={t('close')}
              className="absolute top-5 right-5 text-[#808080] hover:text-[#141414] transition-colors"
            >
              <X size={20} strokeWidth={1.5} />
            </button>

            {status === 'success' ? (
              <p className="font-sans font-light text-[15px] text-[#141414] py-8 text-center">{t('success')}</p>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4 mt-1">
                <div className="pr-6">
                  <h2 className="font-display font-extrabold text-2xl leading-tight tracking-[-0.01em] text-[#141414]">
                    {t('title')}
                  </h2>
                  <p className="font-sans font-light text-sm text-[#808080] mt-1.5">{t('description')}</p>
                </div>

                <div>
                  <label className={fieldLabel}>{t('typeLabel')}</label>
                  <div className="flex bg-coco rounded-full p-1 gap-1">
                    {(['INITIATIVE', 'EVENT'] as const).map(opt => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => update('type', opt)}
                        className={`flex-1 font-sans font-semibold text-sm rounded-full py-1.5 transition-colors ${
                          form.type === opt
                            ? 'bg-white text-caribe shadow-sm'
                            : 'text-[#808080] hover:text-[#141414]'
                        }`}
                      >
                        {opt === 'INITIATIVE' ? t('typeInitiative') : t('typeEvent')}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className={fieldLabel}>{t('categoryLabel')}</label>
                  <select
                    value={form.category}
                    onChange={e => update('category', e.target.value as ResourceCategory)}
                    required
                    className={`${fieldInput} bg-white`}
                  >
                    <option value="" disabled>{t('categoryPlaceholder')}</option>
                    {CATEGORY_ORDER.map(cat => (
                      <option key={cat} value={cat}>{tCat(cat)}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={fieldLabel}>{t('nameLabel')}</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={e => update('name', e.target.value)}
                    required
                    maxLength={60}
                    className={fieldInput}
                  />
                  <p className={fieldHint}>{t('namePlaceholder')}</p>
                </div>

                <div>
                  <label className={fieldLabel}>{t('descriptionFieldLabel')}</label>
                  <textarea
                    value={form.description}
                    onChange={e => update('description', e.target.value)}
                    placeholder={t('descriptionFieldPlaceholder')}
                    rows={3}
                    required
                    maxLength={100}
                    className={`${fieldInput} resize-none`}
                  />
                </div>

                <div>
                  <label className={fieldLabel}>{t('beneficiaryLabel')}</label>
                  <input
                    type="text"
                    value={form.beneficiary}
                    onChange={e => update('beneficiary', e.target.value)}
                    required
                    maxLength={70}
                    className={fieldInput}
                  />
                  <p className={fieldHint}>{t('beneficiaryPlaceholder')}</p>
                </div>

                {form.type === 'EVENT' && (
                  <div>
                    <label className={fieldLabel}>{t('dateLabel')}</label>
                    <input
                      type="text"
                      value={form.date}
                      onChange={e => update('date', e.target.value)}
                      placeholder={t('datePlaceholder')}
                      required
                      maxLength={20}
                      className={fieldInput}
                    />
                  </div>
                )}

                <div>
                  <label className={fieldLabel}>{t('scheduleLabel')}</label>
                  <input
                    type="text"
                    value={form.schedule}
                    onChange={e => update('schedule', e.target.value)}
                    placeholder={t('schedulePlaceholder')}
                    maxLength={40}
                    className={fieldInput}
                  />
                </div>

                <div className="border-t border-[rgba(20,20,20,0.08)] pt-4">
                  <label className={fieldLabel}>{t('countryLabel')}</label>
                  <select
                    value={form.countrySlug}
                    onChange={e => update('countrySlug', e.target.value)}
                    required
                    className={`${fieldInput} bg-white`}
                  >
                    <option value="" disabled>{t('countryPlaceholder')}</option>
                    {countries.map(c => (
                      <option key={c.slug} value={c.slug}>{c.name}</option>
                    ))}
                    <option value={GLOBAL_COUNTRY}>{t('countryGlobalOption')}</option>
                    <option value={OTHER_COUNTRY}>{t('countryOtherOption')}</option>
                  </select>
                </div>

                {form.countrySlug === OTHER_COUNTRY && (
                  <div>
                    <input
                      type="text"
                      value={form.otherCountry}
                      onChange={e => update('otherCountry', e.target.value)}
                      placeholder={t('countryOtherPlaceholder')}
                      required
                      maxLength={60}
                      className={fieldInput}
                    />
                  </div>
                )}

                <div>
                  <label className={fieldLabel}>{t('urlLabel')}</label>
                  <input
                    type="url"
                    value={form.url}
                    onChange={e => update('url', e.target.value)}
                    placeholder={t('urlPlaceholder')}
                    className={fieldInput}
                  />
                </div>

                <div>
                  <label className={fieldLabel}>{t('detailsLabel')}</label>
                  <textarea
                    value={form.details}
                    onChange={e => update('details', e.target.value)}
                    placeholder={t('detailsPlaceholder')}
                    rows={3}
                    maxLength={60}
                    className={`${fieldInput} resize-none`}
                  />
                </div>

                {status === 'error' && (
                  <p className="font-sans font-light text-xs text-emergencia">{t('error')}</p>
                )}

                <button
                  type="submit"
                  disabled={status === 'loading' || !canSubmit}
                  className="flex items-center justify-center gap-2 w-full h-12 rounded-xl bg-caribe text-white font-sans font-semibold text-[15px] disabled:opacity-40 hover:bg-caribe/90 transition-colors"
                >
                  {status === 'loading' ? '...' : t('submit')}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  )
}
