import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ViewToggle } from '@/components/admin/ViewToggle'

describe('ViewToggle', () => {
  it('highlights "Uno a uno" when mode is "one"', () => {
    render(<ViewToggle mode="one" returnTo="/admin/review" action={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Uno a uno' })).toHaveClass('bg-gray-900')
    expect(screen.getByRole('button', { name: 'Lista' })).not.toHaveClass('bg-gray-900')
  })

  it('highlights "Lista" when mode is "list"', () => {
    render(<ViewToggle mode="list" returnTo="/admin/review" action={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Lista' })).toHaveClass('bg-gray-900')
    expect(screen.getByRole('button', { name: 'Uno a uno' })).not.toHaveClass('bg-gray-900')
  })
})
