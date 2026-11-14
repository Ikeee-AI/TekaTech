// Log out asks first (owner decision, 14 Nov 2026): both log-out buttons open a confirm
// dialog, only "Log out" signs out, and Escape/Cancel close it and hand focus back.
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AuthContext } from '../context/authContextValue'
import Navbar from './Navbar'

vi.mock('../api/client', () => ({ api: {} }))
vi.mock('../hooks/useCorrectionBadges', () => ({
  useCorrectionBadges: () => ({ unseenDecisions: 0, pendingCount: 0 }),
}))

const MEMBER = { id: 'u-1', email: 'member@example.com', app_metadata: {}, user_metadata: {} }

function renderNavbar(signOut = vi.fn().mockResolvedValue(undefined)) {
  render(
    <MemoryRouter>
      <AuthContext.Provider value={{ user: MEMBER, signOut }}>
        <Navbar />
      </AuthContext.Provider>
    </MemoryRouter>,
  )
  return signOut
}

const dialog = () => screen.queryByRole('alertdialog', { name: 'Log out of TekaTech?' })
// The desktop icon button (aria-label "Log out"); the mobile one reads "Log Out".
const desktopLogOut = () => screen.getByRole('button', { name: 'Log out' })

afterEach(cleanup)

describe('Navbar log-out confirmation', () => {
  it('opens the dialog from the desktop button and does not sign out yet', () => {
    const signOut = renderNavbar()
    fireEvent.click(desktopLogOut())
    expect(dialog()).not.toBeNull()
    expect(signOut).not.toHaveBeenCalled()
    // The safe choice has focus.
    expect(document.activeElement).toBe(within(dialog()).getByRole('button', { name: 'Cancel' }))
  })

  it('Cancel closes the dialog, keeps the user signed in and returns focus', () => {
    const signOut = renderNavbar()
    const opener = desktopLogOut()
    opener.focus()
    fireEvent.click(opener)
    fireEvent.click(within(dialog()).getByRole('button', { name: 'Cancel' }))
    expect(dialog()).toBeNull()
    expect(signOut).not.toHaveBeenCalled()
    expect(document.activeElement).toBe(opener)
  })

  it('Escape closes the dialog without signing out', () => {
    const signOut = renderNavbar()
    const opener = desktopLogOut()
    opener.focus()
    fireEvent.click(opener)
    fireEvent.keyDown(dialog(), { key: 'Escape' })
    expect(dialog()).toBeNull()
    expect(signOut).not.toHaveBeenCalled()
    expect(document.activeElement).toBe(opener)
  })

  it('only the dialog\'s "Log out" signs out', async () => {
    const signOut = renderNavbar()
    fireEvent.click(desktopLogOut())
    fireEvent.click(within(dialog()).getByRole('button', { name: 'Log out' }))
    await waitFor(() => expect(signOut).toHaveBeenCalledTimes(1))
    await waitFor(() => expect(dialog()).toBeNull())
  })

  it('asks from the mobile menu as well, keeping the menu open on Cancel', () => {
    const signOut = renderNavbar()
    fireEvent.click(screen.getByRole('button', { name: /open menu/i }))
    const mobileLogOut = screen.getByRole('button', { name: 'Log Out' })
    mobileLogOut.focus()
    fireEvent.click(mobileLogOut)
    expect(dialog()).not.toBeNull()
    fireEvent.keyDown(dialog(), { key: 'Escape' })
    expect(dialog()).toBeNull()
    expect(signOut).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Log Out' })).toBe(document.activeElement)
  })

  it('shows a failure in the dialog instead of claiming success', async () => {
    renderNavbar(vi.fn().mockRejectedValue(new Error('network down')))
    fireEvent.click(desktopLogOut())
    fireEvent.click(within(dialog()).getByRole('button', { name: 'Log out' }))
    expect(await within(dialog()).findByText(/couldn't log you out/i)).toBeTruthy()
    expect(screen.queryByText('network down')).toBeNull()
  })
})
