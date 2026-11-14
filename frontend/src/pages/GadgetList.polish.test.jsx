// Catalog polish (14 Nov 2026): brand tiles share one neutral style (colour = selected only),
// the whole card is one link with at most two visible actions on phones plus a "more" menu,
// the hero only features phones with at least 3 of 4 key specs, and popular questions drop
// their counts and doubled brands.
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import GadgetList, { BRAND_TILE_SELECTED_STYLE, BRAND_TILE_STYLE, BrandTile, GadgetCard } from './GadgetList'
import TrendingQuestions from '../components/TrendingQuestions'

const auth = vi.hoisted(() => ({ user: { id: 'u1', app_metadata: {} } }))
const api = vi.hoisted(() => ({
  getGadgets: vi.fn(),
  getSpecs: vi.fn(),
  getMyGadgets: vi.fn(),
  getTrendingQuestions: vi.fn(),
}))
vi.mock('../api/client', () => ({ api }))
vi.mock('../hooks/useAuth', () => ({ useAuth: () => ({ user: auth.user }) }))

const gadgets = [
  { id: 'g1', name: 'Alpha One', brand: 'Alpha', category: 'Smartphone', price_php: 22999, release_date: null },
  { id: 'g2', name: 'Beta Two', brand: 'Beta', category: 'Smartphone', price_php: null, release_date: null },
  { id: 'g3', name: 'Gamma Three', brand: 'Gamma', category: 'Smartphone', price_php: 30000, release_date: null },
]
const FULL = 'RAM: 8 GB\nStorage: 256 GB\nMain camera: 50 MP\nDisplay: 6.7-inch AMOLED, 120Hz'
const specsFor = { g1: FULL, g2: 'RAM: 8 GB', g3: 'Battery: 5000 mAh' }

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

async function renderCatalog() {
  api.getGadgets.mockResolvedValue(gadgets)
  api.getSpecs.mockImplementation((id) =>
    Promise.resolve([{ id: `${id}-s`, gadget_id: id, content: specsFor[id], source_url: null, chunk_index: 0 }]),
  )
  api.getMyGadgets.mockResolvedValue([])
  api.getTrendingQuestions.mockResolvedValue([])
  render(
    <MemoryRouter>
      <GadgetList />
    </MemoryRouter>,
  )
  await screen.findByRole('region', { name: 'Featured phones' }, { timeout: 5000 })
}

describe('brand tiles', () => {
  it('all share one neutral style; only the selected tile takes the accent', async () => {
    await renderCatalog()
    const section = screen.getByRole('heading', { name: 'Shop by brand' }).closest('section')
    const tiles = within(section).getAllByRole('button')
    expect(tiles.map((t) => t.textContent)).toEqual(['All phones3 phones', 'Alpha1 phone', 'Beta1 phone', 'Gamma1 phone'])
    // "All phones" starts selected; the brand tiles are identical.
    expect(tiles[0].className).toContain(BRAND_TILE_SELECTED_STYLE)
    const classes = new Set(tiles.slice(1).map((t) => t.className))
    expect(classes.size).toBe(1)
    expect([...classes][0]).toContain(BRAND_TILE_STYLE)
    fireEvent.click(tiles[2])
    expect(tiles[2].getAttribute('aria-pressed')).toBe('true')
    expect(tiles[2].className).toContain(BRAND_TILE_SELECTED_STYLE)
    expect(tiles[0].className).toContain(BRAND_TILE_STYLE)
  })

  it('renders no random accent colours', () => {
    render(<BrandTile label="Alpha" count={2} pressed={false} onClick={() => {}} />)
    const tile = screen.getByRole('button', { name: /Alpha/ })
    expect(tile.className).not.toMatch(/bg-(pop|inverse|sage)/)
  })
})

describe('featured hero', () => {
  it('only features phones with at least 3 of the 4 key specs', async () => {
    await renderCatalog()
    const hero = screen.getByRole('region', { name: 'Featured phones' })
    // Slides are named "1 of N: name"; only Alpha One qualifies, so there is one slide.
    expect(within(hero).getByRole('group', { name: '1 of 1: Alpha One' })).toBeTruthy()
    expect(within(hero).queryByRole('group', { name: /Beta Two|Gamma Three/ })).toBeNull()
  })

  it('shows the price with normal spacing (sans, tabular figures, no mono)', async () => {
    await renderCatalog()
    const hero = screen.getByRole('region', { name: 'Featured phones' })
    const price = within(hero).getByText('₱22,999')
    expect(price.className).toContain('tabular-nums')
    expect(price.className).not.toContain('font-mono')
  })
})

const gadget = gadgets[0]

function renderCard(props = {}) {
  return render(
    <MemoryRouter>
      <GadgetCard gadget={gadget} selected={false} onToggle={() => {}} onAsk={() => {}} mine={false} onToggleMine={() => {}} {...props} />
    </MemoryRouter>,
  )
}

describe('catalog card', () => {
  it('is one link to the phone page: the name link is stretched over the whole card', () => {
    renderCard()
    const link = screen.getByRole('link', { name: 'Alpha One' })
    expect(link.getAttribute('href')).toBe('/gadgets/g1')
    expect(link.className).toContain('after:absolute')
    expect(link.className).toContain('after:inset-0')
    // Its card is the positioned box the link covers; the actions sit above it.
    expect(link.closest('article').className).toContain('relative')
    const viewSpecs = screen.getByRole('link', { name: 'Details for Alpha One' })
    expect(viewSpecs.parentElement.className).toContain('z-10')
  })

  it('shows two actions plus a "more" menu on phones; Ask AI and Save sit in the menu', () => {
    const onAsk = vi.fn()
    renderCard({ onAsk })
    const more = screen.getByRole('button', { name: 'More actions for Alpha One' })
    // Same row as View specs and Compare; the full action row is desktop only (hidden below sm).
    const row = more.closest('div.relative.z-10')
    expect(within(row).getByRole('link', { name: 'Details for Alpha One' })).toBeTruthy()
    expect(within(row).getByRole('checkbox', { name: 'Compare Alpha One' })).toBeTruthy()
    expect(within(row).getAllByRole('button')).toHaveLength(1)
    expect(screen.getByRole('button', { name: 'Ask AI about Alpha One' }).closest('div.hidden')).toBeTruthy()

    expect(more.getAttribute('aria-expanded')).toBe('false')
    fireEvent.click(more)
    expect(more.getAttribute('aria-expanded')).toBe('true')
    const panel = document.getElementById(more.getAttribute('aria-controls'))
    expect(within(panel).getByRole('button', { name: 'Alpha One: add to My Gadgets' })).toBeTruthy()
    fireEvent.click(within(panel).getByRole('button', { name: 'Ask AI about Alpha One' }))
    expect(onAsk).toHaveBeenCalledTimes(1)
    expect(more.getAttribute('aria-expanded')).toBe('false')
  })

  it('closes the menu on Escape and returns focus to the "more" button', () => {
    renderCard()
    const more = screen.getByRole('button', { name: 'More actions for Alpha One' })
    fireEvent.click(more)
    const panel = document.getElementById(more.getAttribute('aria-controls'))
    fireEvent.keyDown(within(panel).getByRole('button', { name: 'Ask AI about Alpha One' }), { key: 'Escape' })
    expect(more.getAttribute('aria-expanded')).toBe('false')
    expect(document.activeElement).toBe(more)
  })

  it('keeps 44px tap targets on phones', () => {
    renderCard()
    expect(screen.getByRole('link', { name: 'Details for Alpha One' }).className).toContain('!min-h-11')
    expect(screen.getByRole('checkbox', { name: 'Compare Alpha One' }).closest('label').className).toContain('min-h-11')
    expect(screen.getByRole('button', { name: 'More actions for Alpha One' }).className).toContain('h-11')
  })

  it('for a visitor, the whole-card target opens the sign-in prompt instead of linking', () => {
    const onRequireSignIn = vi.fn()
    renderCard({ onRequireSignIn })
    expect(screen.queryByRole('link', { name: 'Alpha One' })).toBeNull()
    const name = screen.getByRole('button', { name: 'Alpha One' })
    expect(name.className).toContain('after:inset-0')
    fireEvent.click(name)
    expect(onRequireSignIn).toHaveBeenCalledTimes(1)
  })

  it('shows "No price yet" as plain secondary text', () => {
    renderCard({ gadget: gadgets[1] })
    const missing = screen.getByText('No price yet')
    expect(missing.className).not.toContain('font-mono')
    expect(missing.className).toContain('text-slate-500')
  })
})

describe('popular questions', () => {
  it('drops the ask counts and shows a doubled brand once', async () => {
    api.getTrendingQuestions.mockResolvedValue([
      { question: 'What are the key specs of the Infinix Infinix Note 40?', count: 15 },
      { question: 'Which phone has the best battery life?', count: 3 },
    ])
    const onSelect = vi.fn()
    render(<TrendingQuestions onSelect={onSelect} />)
    const q = await screen.findByRole('button', { name: 'What are the key specs of the Infinix Note 40?' })
    expect(screen.queryByText(/×/)).toBeNull()
    expect(screen.queryByText(/15/)).toBeNull()
    fireEvent.click(q)
    expect(onSelect).toHaveBeenCalledWith('What are the key specs of the Infinix Note 40?')
  })
})
