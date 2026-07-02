import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { LangPopover } from '@/components/LangPopover'

const pushMock = vi.fn()

vi.mock('next/navigation', () => ({
  usePathname: () => '/es/spain',
  useRouter: () => ({ push: pushMock }),
}))

vi.mock('next-intl', () => ({
  useLocale: () => 'es',
  useTranslations: () => (key: string) => ({ changeLanguage: 'Cambiar idioma' }[key] ?? key),
}))

const activeLocales = [
  { code: 'es' as const, label: 'Español' },
  { code: 'en' as const, label: 'English' },
]

beforeEach(() => pushMock.mockClear())

describe('LangPopover', () => {
  it('abre el dropdown al hacer click en el globo', () => {
    render(<LangPopover activeLocales={activeLocales} countryLocaleMap={{}} />)
    fireEvent.click(screen.getByRole('button', { name: /cambiar idioma/i }))
    expect(screen.getByText('English')).toBeInTheDocument()
    expect(screen.getByText('Español')).toBeInTheDocument()
  })

  it('navega a la misma ruta con el nuevo locale', () => {
    render(<LangPopover activeLocales={activeLocales} countryLocaleMap={{}} />)
    fireEvent.click(screen.getByRole('button', { name: /cambiar idioma/i }))
    fireEvent.click(screen.getByText('English'))
    expect(pushMock).toHaveBeenCalledWith('/en/spain')
  })

  it('cierra el dropdown después de seleccionar', () => {
    render(<LangPopover activeLocales={activeLocales} countryLocaleMap={{}} />)
    fireEvent.click(screen.getByRole('button', { name: /cambiar idioma/i }))
    fireEvent.click(screen.getByText('English'))
    expect(screen.queryByText('English')).not.toBeInTheDocument()
  })

  it('restringe las opciones a los idiomas habilitados para el país actual', () => {
    render(
      <LangPopover
        activeLocales={[...activeLocales, { code: 'de', label: 'Deutsch' }]}
        countryLocaleMap={{ spain: ['es', 'en'] }}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: /cambiar idioma/i }))
    expect(screen.getByText('English')).toBeInTheDocument()
    expect(screen.queryByText('Deutsch')).not.toBeInTheDocument()
  })
})
