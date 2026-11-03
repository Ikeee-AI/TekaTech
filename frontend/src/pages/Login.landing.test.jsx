// Where a successful log-in lands (S5-IK, 3 Nov 2026): a page that sent the user to
// log in wins; otherwise admins go to the catalog and everyone else to My Gadgets.
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { AuthContext } from '../context/authContextValue'
import Login from './Login'

vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }))

function Where() {
  const location = useLocation()
  return <output data-testid="where">{location.pathname + location.search}</output>
}

function logInAs(user, initialEntry = { pathname: '/login' }) {
  const signIn = vi.fn().mockResolvedValue(user)
  render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <AuthContext.Provider value={{ user: null, signIn, signUp: vi.fn() }}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="*" element={<Where />} />
        </Routes>
      </AuthContext.Provider>
    </MemoryRouter>,
  )
  fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'someone@example.com' } })
  fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'not-a-real-password' } })
  fireEvent.click(screen.getByRole('button', { name: /^log in$/i }))
}

afterEach(cleanup)

describe('Log-in landing page', () => {
  it('sends a regular user to My Gadgets', async () => {
    logInAs({ id: 'u-1', app_metadata: {} })
    await waitFor(() => expect(screen.getByTestId('where').textContent).toBe('/my-gadgets'))
  })

  it('sends an admin to the catalog', async () => {
    logInAs({ id: 'u-2', app_metadata: { is_admin: true } })
    await waitFor(() => expect(screen.getByTestId('where').textContent).toBe('/'))
  })

  it('does not treat a user_metadata admin claim as admin', async () => {
    logInAs({ id: 'u-3', app_metadata: {}, user_metadata: { is_admin: true } })
    await waitFor(() => expect(screen.getByTestId('where').textContent).toBe('/my-gadgets'))
  })

  it('returns to the page that asked for a log-in', async () => {
    logInAs({ id: 'u-1', app_metadata: {} }, {
      pathname: '/login',
      state: { from: { pathname: '/compare', search: '?ids=a,b' } },
    })
    await waitFor(() => expect(screen.getByTestId('where').textContent).toBe('/compare?ids=a,b'))
  })
})
