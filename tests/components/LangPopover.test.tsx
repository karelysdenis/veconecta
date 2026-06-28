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

vi.mock('@/i18n', () => ({
  locales: ['es', 'en'],
}))

beforeEach(() => pushMock.mockClear())

describe('LangPopover', () => {
  it('abre el dropdown al hacer click en el globo', () => {
    render(<LangPopover />)
    fireEvent.click(screen.getByRole('button', { name: /cambiar idioma/i }))
    expect(screen.getByText('English')).toBeInTheDocument()
    expect(screen.getByText('Español')).toBeInTheDocument()
  })

  it('navega a la misma ruta con el nuevo locale', () => {
    render(<LangPopover />)
    fireEvent.click(screen.getByRole('button', { name: /cambiar idioma/i }))
    fireEvent.click(screen.getByText('English'))
    expect(pushMock).toHaveBeenCalledWith('/en/spain')
  })

  it('cierra el dropdown después de seleccionar', () => {
    render(<LangPopover />)
    fireEvent.click(screen.getByRole('button', { name: /cambiar idioma/i }))
    fireEvent.click(screen.getByText('English'))
    expect(screen.queryByText('English')).not.toBeInTheDocument()
  })
})
