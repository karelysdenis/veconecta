import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { UpcomingEvents } from '@/components/UpcomingEvents'
import type { SerializedResource } from '@/lib/types'

const messages: Record<string, Record<string, string>> = {
  country: { upcomingEvents: 'Próximos eventos' },
}

vi.mock('next-intl', () => ({
  useTranslations: (namespace: string) => (key: string) => messages[namespace]?.[key] ?? key,
}))

function baseEvent(overrides: Partial<SerializedResource> = {}): SerializedResource {
  return {
    id: 'ev1',
    countrySlug: 'spain',
    category: 'DONATE_PHYSICALLY',
    name: 'Colecta solidaria',
    slug: 'colecta-solidaria',
    nameEn: null,
    namePt: null,
    nameFr: null,
    nameDe: null,
    cityId: null,
    city: null,
    url: null,
    phone: null,
    paymentKey: null,
    address: null,
    schedule: null,
    free: false,
    notesEs: null,
    notesEn: null,
    notesPt: null,
    notesFr: null,
    notesDe: null,
    status: 'PUBLISHED',
    verifiedAt: null,
    verifiedBy: null,
    validUntil: null,
    kind: 'EVENT',
    eventStartsAt: '2026-07-14T00:00:00.000Z',
    eventEndsAt: '2026-07-14T00:00:00.000Z',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

describe('UpcomingEvents', () => {
  it('renders nothing when there are no events', () => {
    const { container } = render(<UpcomingEvents events={[]} locale="es" />)
    expect(container).toBeEmptyDOMElement()
  })

  it('renders the section heading and event name when there is at least one event', () => {
    render(<UpcomingEvents events={[baseEvent()]} locale="es" />)
    expect(screen.getByText('Próximos eventos')).toBeInTheDocument()
    expect(screen.getByText('Colecta solidaria')).toBeInTheDocument()
  })

  it('renders one row per event, in the order given', () => {
    const events = [
      baseEvent({ id: 'ev1', name: 'Primero' }),
      baseEvent({ id: 'ev2', name: 'Segundo' }),
    ]
    render(<UpcomingEvents events={events} locale="es" />)
    const names = screen.getAllByText(/Primero|Segundo/).map((el) => el.textContent)
    expect(names).toEqual(['Primero', 'Segundo'])
  })

  it('excludes events with a null eventStartsAt instead of rendering a bogus date', () => {
    const events = [
      baseEvent({ id: 'ev1', name: 'Sin fecha', eventStartsAt: null }),
      baseEvent({ id: 'ev2', name: 'Con fecha' }),
    ]
    render(<UpcomingEvents events={events} locale="es" />)
    expect(screen.getByText('Con fecha')).toBeInTheDocument()
    expect(screen.queryByText('Sin fecha')).not.toBeInTheDocument()
  })
})
