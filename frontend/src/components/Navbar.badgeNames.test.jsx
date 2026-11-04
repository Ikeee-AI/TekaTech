// #207: a count badge inside a link must not glue its words onto the link text
// ("Review Queue3pending"). getByRole matches the computed accessible name exactly.
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AuthContext } from '../context/authContextValue'
import Navbar from './Navbar'

vi.mock('../api/client', () => ({ api: {} }))
vi.mock('../hooks/useCorrectionBadges', () => ({
  useCorrectionBadges: () => ({ unseenDecisions: 1, pendingCount: 3 }),
}))

const admin = { id: 'a-1', email: 'admin@example.com', app_metadata: { is_admin: true }, user_metadata: {} }

afterEach(cleanup)

describe('Navbar count badge names', () => {
  it('reads the Review Queue count as separate words', () => {
    render(
      <MemoryRouter>
        <AuthContext.Provider value={{ user: admin, signOut: vi.fn() }}>
          <Navbar />
        </AuthContext.Provider>
      </MemoryRouter>,
    )
    expect(screen.getAllByRole('link', { name: 'Review Queue, 3 pending' }).length).toBeGreaterThan(0)
  })

  it('reads the phone menu My Suggestions count as separate words', () => {
    render(
      <MemoryRouter>
        <AuthContext.Provider value={{ user: admin, signOut: vi.fn() }}>
          <Navbar />
        </AuthContext.Provider>
      </MemoryRouter>,
    )
    fireEvent.click(screen.getByRole('button', { name: /menu/i }))
    expect(screen.getByRole('link', { name: 'My Suggestions, 1 new decision' })).toBeTruthy()
  })
})
