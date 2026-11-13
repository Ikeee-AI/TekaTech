// Sign-in gating on the catalog (owner decision, 14 Nov 2026): signed-out visitors may browse,
// search and filter, but asking the AI, comparing, phone pages and My Gadgets open the
// sign-in prompt; Popular/suggested questions and a shared ?ask= panel are hidden from them.
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import GadgetList from './GadgetList'

const gadgets = [
  { id: 'g1', name: 'Alpha One', brand: 'Alpha', category: 'Smartphone', price_php: 10000, release_date: null },
  { id: 'g2', name: 'Beta Two', brand: 'Beta', category: 'Smartphone', price_php: 20000, release_date: null },
]

const auth = vi.hoisted(() => ({ user: null }))
const api = vi.hoisted(() => ({
  getGadgets: vi.fn(),
  getSpecs: vi.fn(),
  getMyGadgets: vi.fn(),
  addMyGadget: vi.fn(),
}))

vi.mock('../api/client', () => ({ api }))
vi.mock('../hooks/useAuth', () => ({ useAuth: () => ({ user: auth.user }) }))
vi.mock('../components/TrendingQuestions', () => ({ default: () => <p>Popular Questions</p> }))
vi.mock('../components/AIAnswerPanel', () => ({ default: ({ question }) => <p>AI panel: {question}</p> }))

function LoginProbe() {
  const location = useLocation()
  return (
    <p>
      Login page {location.search} from {location.state?.from?.pathname}
      {location.state?.from?.search}
    </p>
  )
}

function DetailProbe() {
  return <p>Gadget page</p>
}

async function renderCatalog({ user = null, url = '/' } = {}) {
  auth.user = user
  api.getGadgets.mockResolvedValue(gadgets)
  api.getSpecs.mockImplementation((id) => Promise.resolve([{ id: `${id}-s`, gadget_id: id, content: 'RAM: 8 GB', chunk_index: 0 }]))
  api.getMyGadgets.mockResolvedValue([])
  api.addMyGadget.mockResolvedValue({})
  render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route path="/" element={<GadgetList />} />
        <Route path="/login" element={<LoginProbe />} />
        <Route path="/gadgets/:id" element={<DetailProbe />} />
      </Routes>
    </MemoryRouter>,
  )
  await screen.findByRole('heading', { name: /phones/ })
  // Wait for the spec counts, so the specs request has settled before assertions.
  await screen.findAllByText(/1 sourced spec/i)
}

const signedInUser = { id: 'u1', app_metadata: {} }
const card = (name) => screen.getByRole('checkbox', { name: `Compare ${name}` }).closest('article')
const prompt = () => screen.queryByRole('dialog', { name: 'Sign in to continue' })

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('signed-out visitor on the catalog', () => {
  it('still browses: phones, brand tiles, search and sort are there', async () => {
    await renderCatalog()
    expect(screen.getByRole('heading', { name: 'Shop by brand' })).toBeTruthy()
    expect(screen.getByLabelText('Sort by')).toBeTruthy()
    expect(screen.getByLabelText('Max Price')).toBeTruthy()
    expect(screen.getByRole('region', { name: 'Featured phones' })).toBeTruthy()
    expect(screen.getAllByText('Beta Two').length).toBeGreaterThan(0)
  })

  it('hides Popular Questions and the suggested questions', async () => {
    await renderCatalog()
    expect(screen.queryByText('Popular Questions')).toBeNull()
    expect(screen.queryByRole('button', { name: /best battery life/ })).toBeNull()
  })

  it('does not open the AI panel from a ?ask= link', async () => {
    await renderCatalog({ url: '/?ask=Which%20is%20best' })
    expect(screen.queryByText(/AI panel/)).toBeNull()
    expect(api.getMyGadgets).not.toHaveBeenCalled()
  })

  const gatedControls = [
    ['View specs', () => within(card('Alpha One')).getByRole('button', { name: 'Details for Alpha One' })],
    ['the phone name', () => within(card('Alpha One')).getByRole('button', { name: 'Alpha One' })],
    ['Compare', () => screen.getByRole('checkbox', { name: 'Compare Alpha One' })],
    ['Ask AI', () => within(card('Alpha One')).getByRole('button', { name: 'Ask AI about Alpha One' })],
    ['Save', () => screen.getByRole('button', { name: 'Alpha One: add to My Gadgets' })],
  ]

  for (const [label, getControl] of gatedControls) {
    it(`opens the sign-in prompt from the card's ${label}`, async () => {
      await renderCatalog()
      fireEvent.click(getControl())
      expect(prompt()).toBeTruthy()
      // Nothing happened behind the prompt.
      expect(screen.queryByText('Gadget page')).toBeNull()
      expect(screen.queryByRole('complementary', { name: 'Compare tray' })).toBeNull()
      expect(screen.queryByText(/AI panel/)).toBeNull()
      expect(api.addMyGadget).not.toHaveBeenCalled()
    })
  }

  it("opens the prompt from the hero's View specs, Compare and Ask AI", async () => {
    await renderCatalog()
    const hero = screen.getByRole('region', { name: 'Featured phones' })
    const slide = within(hero).getByRole('group', { name: /of 2:/ })
    for (const name of ['View specs', 'Compare', /^Ask AI about/]) {
      fireEvent.click(within(slide).getByRole('button', { name }))
      expect(prompt()).toBeTruthy()
      fireEvent.keyDown(prompt(), { key: 'Escape' })
      expect(prompt()).toBeNull()
    }
  })

  it('offers Log in and Create account, both returning to the catalog', async () => {
    await renderCatalog({ url: '/?q=Alpha' })
    fireEvent.click(screen.getByRole('button', { name: 'Details for Alpha One' }))
    const dialog = prompt()
    expect(within(dialog).getByText(/create a free account to view specs, compare phones and ask the AI/i)).toBeTruthy()
    expect(within(dialog).getByRole('link', { name: 'Create account' }).getAttribute('href')).toBe('/login?mode=signup')
    fireEvent.click(within(dialog).getByRole('link', { name: 'Log in' }))
    expect(await screen.findByText('Login page from /?q=Alpha')).toBeTruthy()
  })

  it('sends Create account to the sign-up mode', async () => {
    await renderCatalog()
    fireEvent.click(screen.getByRole('checkbox', { name: 'Compare Alpha One' }))
    fireEvent.click(within(prompt()).getByRole('link', { name: 'Create account' }))
    expect(await screen.findByText('Login page ?mode=signup from /')).toBeTruthy()
  })

  it('closes with Not now and keeps focus on the page', async () => {
    await renderCatalog()
    const ask = within(card('Alpha One')).getByRole('button', { name: 'Ask AI about Alpha One' })
    ask.focus()
    fireEvent.click(ask)
    expect(document.activeElement).toBe(within(prompt()).getByRole('link', { name: 'Log in' }))
    fireEvent.click(within(prompt()).getByRole('button', { name: 'Not now' }))
    expect(prompt()).toBeNull()
    expect(document.activeElement).toBe(ask)
  })
})

describe('signed-in user on the catalog', () => {
  it('sees Popular and suggested questions', async () => {
    await renderCatalog({ user: signedInUser })
    expect(screen.getByText('Popular Questions')).toBeTruthy()
    expect(screen.getByRole('button', { name: /best battery life/ })).toBeTruthy()
  })

  it('opens the AI panel from a ?ask= link and from Ask AI', async () => {
    await renderCatalog({ user: signedInUser, url: '/?ask=Which%20is%20best' })
    expect(screen.getByText('AI panel: Which is best')).toBeTruthy()
  })

  it('asks the AI from a card without a prompt', async () => {
    await renderCatalog({ user: signedInUser })
    fireEvent.click(within(card('Alpha One')).getByRole('button', { name: 'Ask AI about Alpha One' }))
    expect(screen.getByText(/AI panel: What are the key specs of the/)).toBeTruthy()
    expect(prompt()).toBeNull()
  })

  it('opens a phone page from View specs and its name', async () => {
    await renderCatalog({ user: signedInUser })
    expect(within(card('Alpha One')).getByRole('link', { name: 'Alpha One' }).getAttribute('href')).toBe('/gadgets/g1')
    fireEvent.click(screen.getByRole('link', { name: 'Details for Alpha One' }))
    expect(await screen.findByText('Gadget page')).toBeTruthy()
  })

  it('adds phones to the compare tray', async () => {
    await renderCatalog({ user: signedInUser })
    fireEvent.click(screen.getByRole('checkbox', { name: 'Compare Alpha One' }))
    expect(screen.getByRole('complementary', { name: 'Compare tray' })).toBeTruthy()
    expect(prompt()).toBeNull()
  })

  it('saves to My Gadgets', async () => {
    await renderCatalog({ user: signedInUser })
    const save = await screen.findByRole('button', { name: 'Alpha One: add to My Gadgets' })
    fireEvent.click(save)
    await waitFor(() => expect(api.addMyGadget).toHaveBeenCalledWith('g1'))
    expect(prompt()).toBeNull()
  })
})
