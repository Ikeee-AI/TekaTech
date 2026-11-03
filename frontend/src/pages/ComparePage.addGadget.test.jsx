// #203: add a gadget on the Compare page without leaving it. The pick updates ?ids=
// (so the share link and AI panel follow), keeps the router state (the way back),
// never offers a gadget already compared, and stops at the 5-gadget limit.
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { AuthContext } from '../context/authContextValue'
import ComparePage from './ComparePage'

const phone = (id) => ({ id, name: `Phone ${id}`, brand: id === 'c' ? 'Acme' : 'Brand', category: 'Smartphone' })

const api = vi.hoisted(
  () =>
    new Proxy(
      {},
      {
        get(target, key) {
          if (!(key in target)) {
            if (key === 'getGadget') target[key] = vi.fn((id) => Promise.resolve(phone(id)))
            else if (key === 'getGadgets') target[key] = vi.fn(() => Promise.resolve(['a', 'b', 'c', 'd'].map(phone)))
            else target[key] = vi.fn(() => Promise.resolve([]))
          }
          return target[key]
        },
      },
    ),
)
vi.mock('../api/client', () => ({ api }))
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }))

function Where() {
  const location = useLocation()
  return <output data-testid="where">{location.search}</output>
}

function renderCompare(entry) {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <AuthContext.Provider value={{ user: null }}>
        <Routes>
          <Route
            path="/compare"
            element={
              <>
                <ComparePage />
                <Where />
              </>
            }
          />
        </Routes>
      </AuthContext.Provider>
    </MemoryRouter>,
  )
}

const addButton = () => screen.findByRole('button', { name: 'Add Gadget' })

afterEach(cleanup)

describe('Compare: add a gadget', () => {
  it('turns a 2-gadget comparison into 3 and keeps the way back', async () => {
    renderCompare({ pathname: '/compare', search: '?ids=a,b', state: { from: '/my-gadgets' } })
    fireEvent.click(await addButton())
    fireEvent.click(await screen.findByRole('button', { name: 'Add Phone c to the comparison' }))
    await waitFor(() => expect(screen.getByTestId('where').textContent).toBe('?ids=a%2Cb%2Cc'))
    expect(await screen.findByRole('heading', { name: 'Comparing 3 Gadgets' })).toBeTruthy()
    expect(screen.getByRole('link', { name: /back to my gadgets/i })).toBeTruthy()
  })

  it('only offers gadgets that are not compared yet, and the search filters them', async () => {
    renderCompare('/compare?ids=a,b')
    fireEvent.click(await addButton())
    await screen.findByRole('button', { name: 'Add Phone c to the comparison' })
    expect(screen.queryByRole('button', { name: 'Add Phone a to the comparison' })).toBeNull()
    expect(screen.getByRole('button', { name: 'Add Phone d to the comparison' })).toBeTruthy()

    fireEvent.change(screen.getByRole('searchbox', { name: 'Search the Catalog' }), { target: { value: 'acme' } })
    expect(screen.getByRole('button', { name: 'Add Phone c to the comparison' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Add Phone d to the comparison' })).toBeNull()
  })

  it('closes on Escape and returns focus to Add Gadget', async () => {
    renderCompare('/compare?ids=a,b')
    const toggle = await addButton()
    fireEvent.click(toggle)
    expect(toggle.getAttribute('aria-expanded')).toBe('true')
    const search = await screen.findByRole('searchbox', { name: 'Search the Catalog' })
    fireEvent.keyDown(search, { key: 'Escape' })
    expect(screen.queryByRole('searchbox', { name: 'Search the Catalog' })).toBeNull()
    expect(toggle.getAttribute('aria-expanded')).toBe('false')
    expect(document.activeElement).toBe(toggle)
  })

  it('offers no Add Gadget at the 5-gadget limit', async () => {
    renderCompare('/compare?ids=a,b,c,d,e')
    expect(await screen.findByRole('heading', { name: 'Comparing 5 Gadgets' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Add Gadget' })).toBeNull()
    expect(screen.getByText(/5 gadgets is the most you can compare/)).toBeTruthy()
  })
})
