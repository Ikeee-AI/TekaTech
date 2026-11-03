// Compare's "back" link returns to where the comparison was opened from: My Gadgets
// (router state from MyGadgets.jsx) or, by default, the catalog.
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { AuthContext } from '../context/authContextValue'
import ComparePage from './ComparePage'

// Every API call resolves; getGadget returns a gadget for the id it was asked about.
const api = vi.hoisted(
  () =>
    new Proxy(
      {},
      {
        get(target, key) {
          if (!(key in target)) {
            target[key] =
              key === 'getGadget'
                ? vi.fn((id) => Promise.resolve({ id, name: `Phone ${id}`, brand: 'Brand', category: 'Smartphone' }))
                : vi.fn(() => Promise.resolve([]))
          }
          return target[key]
        },
      },
    ),
)
vi.mock('../api/client', () => ({ api }))
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }))

function renderCompare(entry) {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <AuthContext.Provider value={{ user: null }}>
        <Routes>
          <Route path="/compare" element={<ComparePage />} />
        </Routes>
      </AuthContext.Provider>
    </MemoryRouter>,
  )
}

afterEach(cleanup)

describe('Compare back link', () => {
  it('goes back to the catalog by default', async () => {
    renderCompare('/compare?ids=a,b')
    const link = await screen.findByRole('link', { name: /back to catalog/i })
    expect(link.getAttribute('href')).toBe('/')
  })

  it('goes back to My Gadgets when the comparison was opened from there', async () => {
    renderCompare({ pathname: '/compare', search: '?ids=a,b', state: { from: '/my-gadgets' } })
    const link = await screen.findByRole('link', { name: /back to my gadgets/i })
    expect(link.getAttribute('href')).toBe('/my-gadgets')
  })

  it('offers the right way back when fewer than two gadgets are selected', async () => {
    renderCompare({ pathname: '/compare', search: '?ids=a', state: { from: '/my-gadgets' } })
    const link = await screen.findByRole('link', { name: /back to my gadgets/i })
    expect(link.getAttribute('href')).toBe('/my-gadgets')
  })
})
