import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { LinkStatusBadge } from '@/components/admin/LinkStatusBadge'

describe('LinkStatusBadge', () => {
  it('renders nothing when there is no url to check', () => {
    const { container } = render(<LinkStatusBadge status="none" />)
    expect(container).toBeEmptyDOMElement()
  })

  it('renders the ok label', () => {
    render(<LinkStatusBadge status="ok" />)
    expect(screen.getByText('🟢 Enlace OK')).toBeInTheDocument()
  })

  it('renders the broken label', () => {
    render(<LinkStatusBadge status="broken" />)
    expect(screen.getByText('🔴 Enlace roto')).toBeInTheDocument()
  })

  it('renders the unknown label', () => {
    render(<LinkStatusBadge status="unknown" />)
    expect(screen.getByText('⚪ No se pudo comprobar')).toBeInTheDocument()
  })
})
