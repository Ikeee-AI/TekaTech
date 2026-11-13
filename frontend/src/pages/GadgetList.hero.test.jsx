// Featured hero rotation (14 Nov 2026): rotates every HERO_ROTATE_MS through the phones with
// saved specs, pauses for the Pause button, pointer hover and keyboard focus (WCAG 2.2.2), and
// offers Prev/Next instead of auto-rotation under prefers-reduced-motion.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import GadgetList, { FeaturedHero, HERO_ROTATE_MS } from './GadgetList'

const gadgets = [
  { id: 'g1', name: 'Alpha One', brand: 'Alpha', category: 'Smartphone', price_php: 10000, release_date: null },
  { id: 'g2', name: 'Beta Two', brand: 'Beta', category: 'Smartphone', price_php: 20000, release_date: null },
  { id: 'g3', name: 'Gamma Three', brand: 'Gamma', category: 'Smartphone', price_php: 30000, release_date: null },
]
const spec = (id, content) => ({ id: `${id}-s`, gadget_id: id, content, source_url: null, chunk_index: 0 })
const specs = {
  g1: [spec('g1', 'RAM: 8 GB')],
  g2: [],
  g3: [spec('g3', 'RAM: 12 GB')],
}

vi.mock('../api/client', () => ({
  api: {
    getGadgets: () => Promise.resolve(gadgets),
    getSpecs: (id) => Promise.resolve(specs[id] ?? []),
    getMyGadgets: () => Promise.resolve([]),
  },
}))
vi.mock('../hooks/useAuth', () => ({ useAuth: () => ({ user: { id: 'u1', app_metadata: {} } }) }))
vi.mock('../components/TrendingQuestions', () => ({ default: () => null }))

const items = gadgets.map((g) => ({ gadget: g, specs: [spec(g.id, 'x')], keySpecs: {} }))

function renderHero(props = {}) {
  return render(
    <MemoryRouter>
      <FeaturedHero items={items} selectedIds={new Set()} onToggleCompare={() => {}} onAsk={() => {}} {...props} />
    </MemoryRouter>,
  )
}

// Hidden slides are aria-hidden, so only the visible one is found by role.
const visibleSlide = () => screen.getByRole('group', { name: /of 3:/ }).getAttribute('aria-label')
const advance = (ms = HERO_ROTATE_MS) => act(() => vi.advanceTimersByTime(ms))

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  delete window.matchMedia
})

describe('featured hero rotation', () => {
  beforeEach(() => vi.useFakeTimers())

  it('moves to the next phone every 8 seconds and wraps around', () => {
    renderHero()
    expect(visibleSlide()).toBe('1 of 3: Alpha One')
    advance(HERO_ROTATE_MS - 1)
    expect(visibleSlide()).toBe('1 of 3: Alpha One')
    advance(1)
    expect(visibleSlide()).toBe('2 of 3: Beta Two')
    advance()
    advance()
    expect(visibleSlide()).toBe('1 of 3: Alpha One')
  })

  it('updates the key-spec tiles with the phone', () => {
    renderHero()
    expect(screen.getByRole('list', { name: 'Alpha One key specs' })).toBeTruthy()
    advance()
    expect(screen.getByRole('list', { name: 'Beta Two key specs' })).toBeTruthy()
    expect(screen.queryByRole('list', { name: 'Alpha One key specs' })).toBeNull()
  })

  it('stops for the Pause button and resumes with Play', () => {
    renderHero()
    const pause = screen.getByRole('button', { name: 'Pause featured phones rotation' })
    // fireEvent.click does not move focus, so only the button's state pauses the rotation here.
    fireEvent.click(pause)
    advance(HERO_ROTATE_MS * 3)
    expect(visibleSlide()).toBe('1 of 3: Alpha One')
    fireEvent.click(screen.getByRole('button', { name: 'Play featured phones rotation' }))
    advance()
    expect(visibleSlide()).toBe('2 of 3: Beta Two')
  })

  it('waits while the pointer is over the hero', () => {
    renderHero()
    const hero = screen.getByRole('region', { name: 'Featured phones' })
    fireEvent.mouseEnter(hero)
    advance(HERO_ROTATE_MS * 2)
    expect(visibleSlide()).toBe('1 of 3: Alpha One')
    fireEvent.mouseLeave(hero)
    advance()
    expect(visibleSlide()).toBe('2 of 3: Beta Two')
  })

  it('waits while keyboard focus is inside the hero', () => {
    renderHero()
    const dot = screen.getByRole('button', { name: 'Show featured phone 1 of 3: Alpha One' })
    act(() => dot.focus())
    advance(HERO_ROTATE_MS * 2)
    expect(visibleSlide()).toBe('1 of 3: Alpha One')
    act(() => dot.blur())
    advance()
    expect(visibleSlide()).toBe('2 of 3: Beta Two')
  })

  it('jumps to a phone from its dot and marks the current dot', () => {
    renderHero()
    const third = screen.getByRole('button', { name: 'Show featured phone 3 of 3: Gamma Three' })
    fireEvent.click(third)
    expect(visibleSlide()).toBe('3 of 3: Gamma Three')
    expect(third.getAttribute('aria-current')).toBe('true')
  })

  it('never announces the change through a live region', () => {
    renderHero()
    const hero = screen.getByRole('region', { name: 'Featured phones' })
    expect(hero.querySelector('[aria-live]')).toBeNull()
  })

  it('does not rotate with prefers-reduced-motion and shows Prev/Next instead', () => {
    window.matchMedia = vi.fn(() => ({ matches: true, addEventListener() {}, removeEventListener() {} }))
    renderHero()
    expect(screen.queryByRole('button', { name: /Pause featured/ })).toBeNull()
    advance(HERO_ROTATE_MS * 3)
    expect(visibleSlide()).toBe('1 of 3: Alpha One')
    fireEvent.click(screen.getByRole('button', { name: 'Next featured phone' }))
    expect(visibleSlide()).toBe('2 of 3: Beta Two')
    fireEvent.click(screen.getByRole('button', { name: 'Previous featured phone' }))
    fireEvent.click(screen.getByRole('button', { name: 'Previous featured phone' }))
    expect(visibleSlide()).toBe('3 of 3: Gamma Three')
  })

  it('shows no controls for a single phone', () => {
    render(
      <MemoryRouter>
        <FeaturedHero items={items.slice(0, 1)} selectedIds={new Set()} onToggleCompare={() => {}} onAsk={() => {}} />
      </MemoryRouter>,
    )
    expect(screen.queryByRole('button', { name: /featured phone/ })).toBeNull()
    expect(screen.queryByRole('button', { name: /Pause/ })).toBeNull()
  })
})

describe('catalog hero', () => {
  it('rotates only through phones with saved specs, in shuffled order', async () => {
    // Math.random() = 0 makes Fisher-Yates move each element to the front: [g1, g3] -> [g3, g1].
    const random = vi.spyOn(Math, 'random').mockReturnValue(0)
    try {
      render(
        <MemoryRouter>
          <GadgetList />
        </MemoryRouter>,
      )
      const hero = await screen.findByRole('region', { name: 'Featured phones' })
      const dots = within(hero).getAllByRole('button', { name: /Show featured phone/ })
      expect(dots.map((d) => d.getAttribute('aria-label'))).toEqual([
        'Show featured phone 1 of 2: Gamma Three',
        'Show featured phone 2 of 2: Alpha One',
      ])
    } finally {
      random.mockRestore()
    }
  })
})
