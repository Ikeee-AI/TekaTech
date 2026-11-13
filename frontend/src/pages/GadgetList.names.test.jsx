// #207: controls whose accessible name adds the gadget name must read as separate words
// ("Compare Phone 1", not "ComparePhone 1"). getByRole matches the computed accessible
// name exactly, so a lost space fails these tests.
// Rebrand step 2: the card is compact. The gadget name is the link to its page (stretched
// over the card); only Compare and Save sit on the card; Ask AI and Delete moved to the page.
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { GadgetCard } from './GadgetList'

vi.mock('../api/client', () => ({ api: {} }))
vi.mock('../hooks/useAuth', () => ({ useAuth: () => ({ user: null }) }))

const gadget = { id: 'id-1', name: 'Phone 1', brand: 'Brand', category: 'Smartphone', price_php: 50990, release_date: null }

afterEach(cleanup)

function renderCard(props = {}) {
  render(
    <MemoryRouter>
      <GadgetCard gadget={gadget} selected={false} onToggle={() => {}} mine={null} {...props} />
    </MemoryRouter>,
  )
}

describe('catalog card', () => {
  it('names each control with a space before the gadget name', () => {
    renderCard()
    expect(screen.getByRole('checkbox', { name: 'Compare Phone 1' })).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Phone 1' }).getAttribute('href')).toBe('/gadgets/id-1')
  })

  it('keeps only Compare and Save on the card', () => {
    renderCard({ mine: false, onToggleMine: () => {} })
    expect(screen.getByRole('button', { name: 'Phone 1: add to My Gadgets' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: /ask ai/i })).toBeNull()
    expect(screen.queryByRole('button', { name: /delete/i })).toBeNull()
  })

  it('shows the price in pesos', () => {
    renderCard()
    expect(screen.getByText('₱50,990')).toBeTruthy()
  })
})
