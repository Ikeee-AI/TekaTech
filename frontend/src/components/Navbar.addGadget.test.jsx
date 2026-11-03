// The catalog is curated by admins (scope change, 3 Nov 2026): POST /gadgets is
// admin-only, so the navbar's Add Gadget button must only appear for an admin.
// user_metadata is client-writable, so claiming is_admin there must not count.
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AuthContext } from '../context/authContextValue'
import Navbar from './Navbar'

vi.mock('../api/client', () => ({ api: {} }))
// Signed-in users trigger the correction-badge polling; it is not under test here.
vi.mock('../hooks/useCorrectionBadges', () => ({
  useCorrectionBadges: () => ({ unseenDecisions: 0, pendingCount: 0 }),
}))

function renderAs(user) {
  return render(
    <MemoryRouter>
      <AuthContext.Provider value={{ user, signOut: vi.fn() }}>
        <Navbar />
      </AuthContext.Provider>
    </MemoryRouter>,
  )
}

const addGadget = () => screen.queryByRole('link', { name: /add gadget/i })

afterEach(cleanup)

describe('Navbar Add Gadget button', () => {
  it('is hidden when nobody is signed in', () => {
    renderAs(null)
    expect(addGadget()).toBeNull()
  })

  it('is hidden for a signed-in regular user', () => {
    renderAs({ id: 'u-1', email: 'user@example.com', app_metadata: {}, user_metadata: {} })
    expect(addGadget()).toBeNull()
  })

  it('is hidden when is_admin is only claimed in user_metadata', () => {
    renderAs({ id: 'u-2', email: 'claims@example.com', app_metadata: {}, user_metadata: { is_admin: true } })
    expect(addGadget()).toBeNull()
  })

  it('is shown to an admin and links to /add', () => {
    renderAs({ id: 'u-3', email: 'admin@example.com', app_metadata: { is_admin: true }, user_metadata: {} })
    expect(addGadget()).not.toBeNull()
    expect(addGadget().getAttribute('href')).toBe('/add')
  })
})
