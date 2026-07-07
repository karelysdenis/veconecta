import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { LinkStatusBadge } from '@/components/admin/LinkStatusBadge'

describe('LinkStatusBadge', () => {
  it('renders nothing when there is no url to check', () => {
    const { container } = render(<LinkStatusBadge status="none" />)
    expect(container).toBeEmptyDOMElement()
  })

  it('renders the ok icon', () => {
    render(<LinkStatusBadge status="ok" />)
    expect(screen.getByLabelText('Enlace OK')).toHaveTextContent('🟢')
  })

  it('renders the broken icon', () => {
    render(<LinkStatusBadge status="broken" />)
    expect(screen.getByLabelText('Enlace roto')).toHaveTextContent('🔴')
  })

  it('renders the unknown icon', () => {
    render(<LinkStatusBadge status="unknown" />)
    expect(screen.getByLabelText('No se pudo comprobar')).toHaveTextContent('⚪')
  })
})
