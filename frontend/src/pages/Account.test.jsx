// #204: the Account page shows the user's details and changes the password only after
// re-checking the current one.
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AuthContext } from '../context/authContextValue'
import Account from './Account'
import { validatePasswordChange } from '../utils/passwordChange'

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
    ...auth,
  }
  render(
    <MemoryRouter>
      <AuthContext.Provider value={value}>
        <Account />
      </AuthContext.Provider>
    </MemoryRouter>,
  )
  return value
}

const type = (label, text) => fireEvent.change(screen.getByLabelText(label), { target: { value: text } })
function fillAndSubmit({ current = 'old-secret', next = 'new-secret', confirm = next } = {}) {
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
    await waitFor(() => expect(auth.updatePassword).toHaveBeenCalledWith('new-secret'))
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
    expect(screen.getByText(/use at least 6 characters/i)).toBeTruthy()
    expect(screen.getByText(/passwords don't match/i)).toBeTruthy()
    expect(auth.signIn).not.toHaveBeenCalled()
    expect(auth.updatePassword).not.toHaveBeenCalled()
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

describe('validatePasswordChange', () => {
  it.each([
    [{ current: '', next: 'new-secret', confirm: 'new-secret' }, ['current']],
    [{ current: 'old-secret', next: '12345', confirm: '12345' }, ['next']],
    [{ current: 'same-one', next: 'same-one', confirm: 'same-one' }, ['next']],
    [{ current: 'old-secret', next: 'new-secret', confirm: 'new-secreT' }, ['confirm']],
    [{ current: 'old-secret', next: 'new-secret', confirm: 'new-secret' }, []],
  ])('%j → errors on %j', (values, fields) => {
    expect(Object.keys(validatePasswordChange(values)).sort()).toEqual(fields)
  })
})
