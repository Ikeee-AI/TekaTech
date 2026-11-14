// #204: the Account page shows the user's details and changes the password only after
// re-checking the current one. #213: "Delete my account" re-checks the password too, asks
// for confirmation, then calls DELETE /me/account and signs out.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useState } from 'react'
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import toast from 'react-hot-toast'
import { AuthContext } from '../context/authContextValue'
import { api } from '../api/client'
import Account from './Account'
import ProtectedRoute from '../components/ProtectedRoute'
import { validatePasswordChange } from '../utils/passwordChange'

vi.mock('../api/client', () => ({ api: { deleteMyAccount: vi.fn() } }))
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn() } }))

const USER = {
  id: 'u-1',
  email: 'member@example.com',
  created_at: '2026-10-30T03:50:00Z',
  app_metadata: {},
  user_metadata: { is_admin: true }, // client-writable: must not count as admin
}

const wrongPassword = () =>
  Object.assign(new Error('Invalid login credentials'), { code: 'invalid_credentials', status: 400 })

function renderAccount({ user = USER, auth = {} } = {}) {
  const value = {
    user,
    signIn: vi.fn().mockResolvedValue(user),
    updatePassword: vi.fn().mockResolvedValue(undefined),
    signOut: vi.fn().mockResolvedValue(undefined),
    ...auth,
  }
  render(
    <MemoryRouter initialEntries={['/account']}>
      <AuthContext.Provider value={value}>
        <Routes>
          <Route path="/account" element={<Account />} />
          <Route path="/" element={<p>Catalog page</p>} />
        </Routes>
      </AuthContext.Provider>
    </MemoryRouter>,
  )
  return value
}

const type = (label, text) => fireEvent.change(screen.getByLabelText(label), { target: { value: text } })
function fillAndSubmit({ current = 'old-secret', next = 'New-secret-9', confirm = next } = {}) {
  type(/^current password/i, current)
  type(/^new password/i, next)
  type(/^confirm new password/i, confirm)
  fireEvent.click(screen.getByRole('button', { name: /update password/i }))
}

afterEach(cleanup)

describe('Account details', () => {
  it('shows the email, join date, role and links to the user lists', () => {
    renderAccount()
    expect(screen.getByText('member@example.com')).toBeTruthy()
    expect(screen.getByText(/2026/)).toBeTruthy()
    // user_metadata.is_admin is client-writable, so this user is a member.
    expect(screen.getByText(/^member \(suggests corrections/i)).toBeTruthy()
    expect(screen.getByRole('link', { name: /^my gadgets$/i }).getAttribute('href')).toBe('/my-gadgets')
    expect(screen.getByRole('link', { name: /^my suggestions$/i }).getAttribute('href')).toBe('/my-suggestions')
  })

  it('shows Admin only from app_metadata', () => {
    renderAccount({ user: { ...USER, app_metadata: { is_admin: true } } })
    expect(screen.getByText(/admin \(curates the catalog\)/i)).toBeTruthy()
  })
})

describe('Change password', () => {
  it('re-checks the current password, then updates and clears the form', async () => {
    const auth = renderAccount()
    fillAndSubmit()
    await waitFor(() => expect(auth.updatePassword).toHaveBeenCalledWith('New-secret-9'))
    expect(auth.signIn).toHaveBeenCalledWith('member@example.com', 'old-secret')
    expect(auth.signIn.mock.invocationCallOrder[0]).toBeLessThan(auth.updatePassword.mock.invocationCallOrder[0])
    expect(await screen.findByText('Password Updated')).toBeTruthy()
    expect(screen.getByLabelText(/^current password/i).value).toBe('')
  })

  it('does not change the password when the current one is wrong', async () => {
    const auth = renderAccount({ auth: { signIn: vi.fn().mockRejectedValue(wrongPassword()) } })
    fillAndSubmit({ current: 'guess' })
    expect(await screen.findByText('Your current password is incorrect.')).toBeTruthy()
    // Let the submit handler finish before checking nothing else happened.
    await waitFor(() => expect(screen.getByRole('button', { name: /update password/i }).disabled).toBe(false))
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(auth.updatePassword).not.toHaveBeenCalled()
    expect(screen.queryByText('Password Updated')).toBeNull()
    // Only the field message, not a second, raw "Invalid login credentials" alert.
    expect(screen.queryByText('Password Not Updated')).toBeNull()
    expect(screen.getByLabelText(/^current password/i).getAttribute('aria-invalid')).toBe('true')
  })

  it('checks the fields before calling Supabase', () => {
    const auth = renderAccount()
    fillAndSubmit({ next: 'abc', confirm: 'abd' })
    expect(screen.getByText(/make it stronger: use at least 8 characters/i)).toBeTruthy()
    expect(screen.getByText(/passwords don't match/i)).toBeTruthy()
    expect(auth.signIn).not.toHaveBeenCalled()
    expect(auth.updatePassword).not.toHaveBeenCalled()
  })

  it.each(['new-secret', 'NEW-SECRET-9', 'New-secret', 'Newsecret9', 'Ne-se-9'])(
    'blocks the weak new password %j before calling Supabase',
    (next) => {
      const auth = renderAccount()
      fillAndSubmit({ next })
      expect(screen.getByText(/^make it stronger/i)).toBeTruthy()
      expect(screen.getByLabelText(/^new password/i).getAttribute('aria-invalid')).toBe('true')
      expect(document.activeElement).toBe(screen.getByLabelText(/^new password/i))
      expect(auth.signIn).not.toHaveBeenCalled()
      expect(auth.updatePassword).not.toHaveBeenCalled()
    },
  )

  it('shows the strength meter as the new password is typed', () => {
    renderAccount()
    type(/^new password/i, 'New-secret-9')
    expect(screen.getByText('Strong')).toBeTruthy()
  })

  it('shows other failures in plain words, such as a rate limit', async () => {
    renderAccount({
      auth: { updatePassword: vi.fn().mockRejectedValue(Object.assign(new Error('rate'), { status: 429 })) },
    })
    fillAndSubmit()
    expect(await screen.findByText(/too many requests/i)).toBeTruthy()
    expect(screen.getByText('Password Not Updated')).toBeTruthy()
  })
})

describe('Delete my account', () => {
  const deleteDialog = () => screen.queryByRole('alertdialog', { name: /delete your tekatech account/i })
  const startDelete = (password = 'old-secret') => {
    type(/^your password/i, password)
    fireEvent.click(screen.getByRole('button', { name: /^delete my account$/i }))
  }
  const confirmDelete = () =>
    fireEvent.click(within(deleteDialog()).getByRole('button', { name: /yes, delete my account/i }))
  const apiError = (status, message) => Object.assign(new Error(message), { status })

  beforeEach(() => {
    api.deleteMyAccount.mockReset()
    toast.success.mockReset()
  })

  it('re-checks the password, deletes, signs out and shows a notice on the catalog', async () => {
    api.deleteMyAccount.mockResolvedValue(null)
    const auth = renderAccount()
    startDelete()
    confirmDelete()
    expect(await screen.findByText('Catalog page')).toBeTruthy()
    expect(auth.signIn).toHaveBeenCalledWith('member@example.com', 'old-secret')
    expect(api.deleteMyAccount).toHaveBeenCalledTimes(1)
    // The sign-out runs once the catalog has replaced the Account page (unmount cleanup).
    await waitFor(() => expect(auth.signOut).toHaveBeenCalledTimes(1))
    // Local sign-out only: the account is gone, and it can't fail silently on the network.
    expect(auth.signOut).toHaveBeenCalledWith({ scope: 'local' })
    expect(auth.signIn.mock.invocationCallOrder[0]).toBeLessThan(api.deleteMyAccount.mock.invocationCallOrder[0])
    expect(api.deleteMyAccount.mock.invocationCallOrder[0]).toBeLessThan(auth.signOut.mock.invocationCallOrder[0])
    expect(toast.success).toHaveBeenCalledWith(expect.stringMatching(/account was deleted/i), expect.anything())
  })

  it('sends nothing until the confirm step, and Cancel sends nothing', () => {
    const auth = renderAccount()
    startDelete()
    expect(deleteDialog()).not.toBeNull()
    expect(auth.signIn).not.toHaveBeenCalled()
    expect(api.deleteMyAccount).not.toHaveBeenCalled()
    fireEvent.click(within(deleteDialog()).getByRole('button', { name: 'Cancel' }))
    expect(deleteDialog()).toBeNull()
    expect(auth.signIn).not.toHaveBeenCalled()
    expect(api.deleteMyAccount).not.toHaveBeenCalled()
    expect(auth.signOut).not.toHaveBeenCalled()
  })

  it('asks for the password before opening the confirm step', () => {
    const auth = renderAccount()
    fireEvent.click(screen.getByRole('button', { name: /^delete my account$/i }))
    expect(deleteDialog()).toBeNull()
    expect(screen.getByLabelText(/^your password/i).getAttribute('aria-invalid')).toBe('true')
    expect(document.activeElement).toBe(screen.getByLabelText(/^your password/i))
    expect(auth.signIn).not.toHaveBeenCalled()
  })

  it('does not delete when the password is wrong, and focuses the field', async () => {
    const auth = renderAccount({ auth: { signIn: vi.fn().mockRejectedValue(wrongPassword()) } })
    startDelete('guess')
    confirmDelete()
    expect(await screen.findByText('Your current password is incorrect.')).toBeTruthy()
    await waitFor(() => expect(deleteDialog()).toBeNull())
    expect(document.activeElement).toBe(screen.getByLabelText(/^your password/i))
    expect(api.deleteMyAccount).not.toHaveBeenCalled()
    expect(auth.signOut).not.toHaveBeenCalled()
  })

  it('tells an admin up front and disables the delete', () => {
    const auth = renderAccount({ user: { ...USER, app_metadata: { is_admin: true } } })
    const note = screen.getByText("Admin accounts can't be deleted here. Ask the owner to remove the admin flag first.")
    expect(note).toBeTruthy()
    const button = screen.getByRole('button', { name: /^delete my account$/i })
    expect(button.disabled).toBe(true)
    expect(button.getAttribute('aria-describedby')).toBe('delete-account-admin-note')
    fireEvent.submit(button.closest('form'))
    expect(deleteDialog()).toBeNull()
    expect(auth.signIn).not.toHaveBeenCalled()
    expect(api.deleteMyAccount).not.toHaveBeenCalled()
  })

  it('still explains a 409 (flag added after the page loaded) and stays signed in', async () => {
    api.deleteMyAccount.mockRejectedValue(apiError(409, 'Admin accounts cannot be deleted here.'))
    const auth = renderAccount()
    startDelete()
    confirmDelete()
    expect(
      await screen.findByText("Admin accounts can't be deleted here. Ask the owner to remove the admin flag first."),
    ).toBeTruthy()
    expect(screen.getByText('Account Not Deleted')).toBeTruthy()
    expect(deleteDialog()).toBeNull()
    expect(auth.signOut).not.toHaveBeenCalled()
    expect(toast.success).not.toHaveBeenCalled()
    expect(screen.queryByText('Catalog page')).toBeNull()
  })

  it('shows a friendly message on a network failure and keeps the dialog open to retry', async () => {
    api.deleteMyAccount.mockRejectedValueOnce(new TypeError('Failed to fetch')).mockResolvedValueOnce(null)
    const auth = renderAccount()
    startDelete()
    confirmDelete()
    expect(await screen.findByText(/can't reach the server/i)).toBeTruthy()
    expect(deleteDialog()).not.toBeNull()
    expect(auth.signOut).not.toHaveBeenCalled()
    // The password stays filled in, so a retry needs only the confirm button.
    confirmDelete()
    expect(await screen.findByText('Catalog page')).toBeTruthy()
    expect(api.deleteMyAccount).toHaveBeenCalledTimes(2)
  })

  it("shows the backend's 503 message", async () => {
    api.deleteMyAccount.mockRejectedValue(apiError(503, "Couldn't delete your account right now. Try again."))
    const auth = renderAccount()
    startDelete()
    confirmDelete()
    expect(await screen.findByText("Couldn't delete your account right now. Try again.")).toBeTruthy()
    expect(auth.signOut).not.toHaveBeenCalled()
  })

  it('cannot be submitted twice while the delete is running', async () => {
    let finish
    api.deleteMyAccount.mockReturnValue(new Promise((resolve) => (finish = resolve)))
    renderAccount()
    startDelete()
    confirmDelete()
    const busyButton = await within(deleteDialog()).findByRole('button', { name: /deleting/i })
    expect(busyButton.disabled).toBe(true)
    expect(within(deleteDialog()).getByRole('button', { name: 'Cancel' }).disabled).toBe(true)
    expect(screen.getByRole('button', { name: /^delete my account$/i }).disabled).toBe(true)
    fireEvent.click(busyButton)
    finish(null)
    expect(await screen.findByText('Catalog page')).toBeTruthy()
    expect(api.deleteMyAccount).toHaveBeenCalledTimes(1)
  })

  it('ignores a second confirm in the same tick, before the button is disabled', async () => {
    api.deleteMyAccount.mockResolvedValue(null)
    const auth = renderAccount()
    startDelete()
    const confirm = within(deleteDialog()).getByRole('button', { name: /yes, delete my account/i })
    // Inside one act() React does not re-render between the clicks, so the button is still
    // enabled and the handler's state is stale for the second click: only the ref guard stops it.
    await act(async () => {
      confirm.click()
      confirm.click()
    })
    expect(await screen.findByText('Catalog page')).toBeTruthy()
    expect(auth.signIn).toHaveBeenCalledTimes(1)
    expect(api.deleteMyAccount).toHaveBeenCalledTimes(1)
    await waitFor(() => expect(auth.signOut).toHaveBeenCalledTimes(1))
  })

  it('lands on the catalog, not /login, behind ProtectedRoute when sign-out clears the user', async () => {
    api.deleteMyAccount.mockResolvedValue(null)
    const loginRendered = vi.fn()
    const signedOut = vi.fn()
    function LoginPage() {
      loginRendered()
      return <p>Login page</p>
    }
    // Like AuthProvider: signing out sets the user to null, which makes ProtectedRoute redirect.
    function StatefulAuth() {
      const [user, setUser] = useState(USER)
      const value = {
        user,
        loading: false,
        signIn: vi.fn().mockResolvedValue(USER),
        updatePassword: vi.fn(),
        signOut: async (options) => {
          signedOut(options)
          setUser(null)
        },
      }
      return (
        <AuthContext.Provider value={value}>
          <Routes>
            <Route path="/account" element={<ProtectedRoute><Account /></ProtectedRoute>} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/" element={<p>Catalog page</p>} />
          </Routes>
        </AuthContext.Provider>
      )
    }
    render(
      <MemoryRouter initialEntries={['/account']}>
        <StatefulAuth />
      </MemoryRouter>,
    )
    startDelete()
    confirmDelete()
    expect(await screen.findByText('Catalog page')).toBeTruthy()
    // The user really is signed out, and that did not bounce the page to /login.
    await waitFor(() => expect(signedOut).toHaveBeenCalledWith({ scope: 'local' }))
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(screen.getByText('Catalog page')).toBeTruthy()
    expect(loginRendered).not.toHaveBeenCalled()
  })
})

describe('validatePasswordChange', () => {
  it.each([
    [{ current: '', next: 'New-secret-9', confirm: 'New-secret-9' }, ['current']],
    [{ current: 'old-secret', next: '12345', confirm: '12345' }, ['next']],
    [{ current: 'old-secret', next: 'new-secret', confirm: 'new-secret' }, ['next']],
    [{ current: 'Same-one-9', next: 'Same-one-9', confirm: 'Same-one-9' }, ['next']],
    [{ current: 'old-secret', next: 'New-secret-9', confirm: 'New-secret-8' }, ['confirm']],
    [{ current: 'old-secret', next: 'New-secret-9', confirm: 'New-secret-9' }, []],
  ])('%j → errors on %j', (values, fields) => {
    expect(Object.keys(validatePasswordChange(values)).sort()).toEqual(fields)
  })
})
