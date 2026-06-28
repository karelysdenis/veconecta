import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ShareButton } from '@/components/ShareButton'

afterEach(() => vi.restoreAllMocks())

describe('ShareButton', () => {
  it('usa Web Share API cuando está disponible', async () => {
    const shareMock = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'share', { value: shareMock, configurable: true })

    render(<ShareButton />)
    fireEvent.click(screen.getByRole('button', { name: /compartir/i }))
    await waitFor(() => expect(shareMock).toHaveBeenCalledOnce())
  })

  it('copia al clipboard cuando no hay Web Share API', async () => {
    Object.defineProperty(navigator, 'share', { value: undefined, configurable: true })
    const writeMock = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: writeMock },
      configurable: true,
    })

    render(<ShareButton />)
    fireEvent.click(screen.getByRole('button', { name: /compartir/i }))
    await waitFor(() => expect(writeMock).toHaveBeenCalledOnce())
    expect(screen.getByText('¡Copiado!')).toBeInTheDocument()
  })

  it('no lanza error si clipboard está bloqueado', async () => {
    Object.defineProperty(navigator, 'share', { value: undefined, configurable: true })
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: vi.fn().mockRejectedValue(new Error('denied')) },
      configurable: true,
    })

    render(<ShareButton />)
    fireEvent.click(screen.getByRole('button', { name: /compartir/i }))
    await new Promise(r => setTimeout(r, 50))
    expect(screen.queryByText('¡Copiado!')).not.toBeInTheDocument()
  })
})
