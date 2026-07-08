import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ResourceReviewCard, type ReviewResource } from '@/components/admin/ResourceReviewCard'

const baseResource: ReviewResource = {
  id: 'r1',
  countrySlug: 'spain',
  category: 'DONATE_MONEY',
  status: 'PUBLISHED',
  name: 'Fundación X',
  nameEn: null,
  namePt: null,
  url: 'https://fundacionx.org',
  phone: null,
  paymentKey: null,
  address: null,
  schedule: null,
  validUntil: null,
  notesEs: null,
  free: false,
  verifiedAt: null,
  city: null,
}

function renderCard(overrides: Partial<Parameters<typeof ResourceReviewCard>[0]> = {}) {
  return render(
    <ResourceReviewCard
      resource={baseResource}
      linkStatus="ok"
      editHref="/admin/spain/r1"
      confirmAction={vi.fn()}
      archiveAction={vi.fn()}
      confirmHiddenFields={{ id: 'r1' }}
      archiveHiddenFields={{ id: 'r1' }}
      {...overrides}
    />,
  )
}

describe('ResourceReviewCard', () => {
  it('renders resource name, category label, and the confirm button when unverified', () => {
    renderCard()
    expect(screen.getByText('Fundación X')).toBeInTheDocument()
    expect(screen.getByText('Donar dinero')).toBeInTheDocument()
    expect(screen.getByText('Sin confirmar')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '✓ Confirmar info' })).toBeInTheDocument()
  })

  it('shows the reconfirm button and "confirmado" badge when verified today', () => {
    renderCard({ resource: { ...baseResource, verifiedAt: new Date() } })
    expect(screen.getByText('Recurso confirmado')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '↻ Reconfirmar' })).toBeInTheDocument()
  })

  it('hides the country block by default and shows it when the country prop is passed', () => {
    const { rerender } = renderCard()
    expect(screen.queryByText('España')).not.toBeInTheDocument()

    rerender(
      <ResourceReviewCard
        resource={baseResource}
        linkStatus="none"
        country={{ slug: 'spain', nameEs: 'España', cca2: 'es', flag: '🇪🇸' }}
        editHref="/admin/spain/r1"
        confirmAction={vi.fn()}
        archiveAction={vi.fn()}
        confirmHiddenFields={{ id: 'r1' }}
        archiveHiddenFields={{ id: 'r1' }}
      />,
    )
    expect(screen.getByText('España')).toBeInTheDocument()
  })

  it('hides the "Archivar" button once the resource is already archived', () => {
    renderCard({ resource: { ...baseResource, status: 'ARCHIVED' } })
    expect(screen.queryByRole('button', { name: 'Archivar' })).not.toBeInTheDocument()
  })
})
