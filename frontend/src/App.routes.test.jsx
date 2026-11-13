// Members-only routes (owner decision, 14 Nov 2026): signed-out visitors opening a phone page,
// compare, a shared comparison link or My Gadgets go to log in, carrying `from` so Login sends
// them back to the exact page afterwards. The catalog home stays public.
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter, useLocation } from 'react-router-dom'
import App from './App'

const auth = vi.hoisted(() => ({ user: null, loading: false }))

vi.mock('./hooks/useAuth', () => ({ useAuth: () => auth }))
vi.mock('./components/Navbar', () => ({ default: () => null }))
vi.mock('./components/ServerWakeBanner', () => ({ default: () => null }))
vi.mock('./components/AuthLinkNotice', () => ({ default: () => null }))
vi.mock('./pages/GadgetList', () => ({ default: () => <p>Catalog page</p> }))
vi.mock('./pages/GadgetDetail', () => ({ default: () => <p>Gadget page</p> }))
vi.mock('./pages/ComparePage', () => ({ default: () => <p>Compare page</p> }))
vi.mock('./pages/ShortLinkRedirect', () => ({ default: () => <p>Shared link page</p> }))
vi.mock('./pages/MyGadgets', () => ({ default: () => <p>My Gadgets page</p> }))
vi.mock('./pages/Login', () => ({
  default: function LoginProbe() {
    const from = useLocation().state?.from
    return <p>Login page from {from ? `${from.pathname}${from.search}` : 'nowhere'}</p>
  },
}))

function renderAt(url, user) {
  auth.user = user
  render(
    <MemoryRouter initialEntries={[url]}>
      <App />
    </MemoryRouter>,
  )
}

const ROUTES = [
  ['/gadgets/g1', 'Gadget page'],
  ['/compare?ids=g1,g2', 'Compare page'],
  ['/c/abc123', 'Shared link page'],
  ['/my-gadgets', 'My Gadgets page'],
]

afterEach(cleanup)

describe('members-only routes', () => {
  for (const [url, page] of ROUTES) {
    it(`sends a signed-out visitor from ${url} to log in and back`, async () => {
      renderAt(url, null)
      expect(await screen.findByText(`Login page from ${url}`)).toBeTruthy()
      expect(screen.queryByText(page)).toBeNull()
    })

    it(`opens ${url} for a signed-in user`, async () => {
      renderAt(url, { id: 'u1', app_metadata: {} })
      expect(await screen.findByText(page)).toBeTruthy()
    })
  }

  it('keeps the catalog home public', async () => {
    renderAt('/', null)
    expect(await screen.findByText('Catalog page')).toBeTruthy()
  })
})
