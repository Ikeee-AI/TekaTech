// Max Price slider: its steps count from the lowest price, so with prices 14,999 and 45,000 the top
// stop is 44,999. Dragging it fully right must mean "no limit" and show every gadget, including the
// most expensive one and gadgets without a price.
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import GadgetList from './GadgetList'

const gadgets = [
  { id: 'g1', name: 'Poco x7 Pro', brand: 'Poco', category: 'Smartphone', price_php: 14999, release_date: null },
  { id: 'g2', name: 'Infinix Note 50 Pro 5G+', brand: 'Infinix', category: 'Smartphone', price_php: 20000, release_date: null },
  { id: 'g3', name: 'Rog Ally', brand: 'Asus', category: 'Console', price_php: 45000, release_date: null },
  { id: 'g4', name: 'iPhone 15', brand: 'Apple', category: 'Smartphone', price_php: null, release_date: null },
]

vi.mock('../api/client', () => ({ api: { getGadgets: () => Promise.resolve(gadgets) } }))
vi.mock('../hooks/useAuth', () => ({ useAuth: () => ({ user: null }) }))
vi.mock('../components/TrendingQuestions', () => ({ default: () => null }))

afterEach(cleanup)

async function renderCatalog() {
  render(
    <MemoryRouter>
      <GadgetList />
    </MemoryRouter>,
  )
  return screen.findByLabelText('Max Price')
}

const shown = (name) => screen.queryAllByText(name).length > 0

describe('Max Price slider', () => {
  it('shows every gadget when dragged to its last stop', async () => {
    const slider = await renderCatalog()
    fireEvent.change(slider, { target: { value: '44999' } })

    for (const g of gadgets) expect(shown(g.name)).toBe(true)
    expect(screen.queryByText(/Up to/)).toBeNull()
  })

  it('still filters below the last stop', async () => {
    const slider = await renderCatalog()
    fireEvent.change(slider, { target: { value: '20099' } })

    expect(shown('Infinix Note 50 Pro 5G+')).toBe(true)
    expect(shown('Rog Ally')).toBe(false)
    expect(shown('iPhone 15')).toBe(false)
    expect(screen.getAllByText(/Up to/).length).toBeGreaterThan(0)
  })
})
