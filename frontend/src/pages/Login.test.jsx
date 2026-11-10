// #196: resend the sign-up confirmation email, from ?mode=resend or after "Email not confirmed".
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AuthContext } from '../context/authContextValue'
import { takeReturnPath } from '../utils/returnPath'
import Login from './Login'

const notConfirmed = () =>
  Object.assign(new Error('Email not confirmed'), { code: 'email_not_confirmed', status: 400 })

function renderLogin({ url = '/login', auth = {}, from } = {}) {
  const value = {
    signIn: vi.fn().mockResolvedValue(undefined),
    signUp: vi.fn(),
    resendConfirmation: vi.fn().mockResolvedValue(undefined),
    ...auth,
  }
  render(
    <MemoryRouter initialEntries={[from ? { pathname: url.split('?')[0], search: url.includes('?') ? `?${url.split('?')[1]}` : '', state: { from } } : url]}>
      <AuthContext.Provider value={value}>
        <Login />
      </AuthContext.Provider>
    </MemoryRouter>,
  )
  return value
}

const type = (label, text) => fireEvent.change(screen.getByLabelText(label), { target: { value: text } })

afterEach(() => {
  cleanup()
  window.localStorage.clear()
})

describe('Sign up remembers the starting page (#196 item 4)', () => {
  const FROM = { pathname: '/gadgets/42', search: '?ask=chip', hash: '' }
  const signUpSent = () => vi.fn().mockResolvedValue({ user: { identities: [{}] }, session: null })

  it('saves the page the user came from when the confirmation email is sent', async () => {
    renderLogin({ url: '/login?mode=signup', from: FROM, auth: { signUp: signUpSent() } })
    type(/email/i, 'new.user@example.com')
    type(/password/i, 'long-enough-1')
    fireEvent.click(screen.getByRole('button', { name: 'Sign Up' }))
    await screen.findByText('Account Created')
    expect(takeReturnPath()).toBe('/gadgets/42?ask=chip')
  })

  it('saves it again when a new confirmation email is requested', async () => {
    renderLogin({ url: '/login?mode=resend', from: FROM })
    type(/email/i, 'new.user@example.com')
    fireEvent.click(screen.getByRole('button', { name: /send confirmation email/i }))
    await screen.findByText('Check Your Email')
    expect(takeReturnPath()).toBe('/gadgets/42?ask=chip')
  })

  it('saves nothing when the user opened Log In directly', async () => {
    renderLogin({ url: '/login?mode=signup', auth: { signUp: signUpSent() } })
    type(/email/i, 'new.user@example.com')
    type(/password/i, 'long-enough-1')
    fireEvent.click(screen.getByRole('button', { name: 'Sign Up' }))
    await screen.findByText('Account Created')
    expect(window.localStorage.length).toBe(0)
  })
})

describe('Login modes from the URL', () => {
  it('opens Sign Up with ?mode=signup', () => {
    renderLogin({ url: '/login?mode=signup' })
    expect(screen.getByRole('heading', { name: 'Create an Account' })).toBeTruthy()
  })

  it('falls back to Log In for an unknown mode', () => {
    renderLogin({ url: '/login?mode=admin' })
    expect(screen.getByRole('heading', { name: 'Log In' })).toBeTruthy()
  })
})

describe('Resend confirmation email (#196)', () => {
  it('?mode=resend asks only for the email and sends a new link', async () => {
    const auth = renderLogin({ url: '/login?mode=resend' })
    expect(screen.getByRole('heading', { name: 'Resend Confirmation Email' })).toBeTruthy()
    expect(screen.queryByLabelText(/password/i)).toBeNull()

    type(/email/i, 'new.user@example.com')
    fireEvent.click(screen.getByRole('button', { name: /send confirmation email/i }))

    await waitFor(() => expect(auth.resendConfirmation).toHaveBeenCalledWith('new.user@example.com'))
    // Neutral: it doesn't say whether the address has an account.
    expect(await screen.findByText(/if this email has an account that isn't confirmed yet/i)).toBeTruthy()
  })

  it('maps "Email not confirmed" to a plain sentence and offers to resend', async () => {
    const auth = renderLogin({ auth: { signIn: vi.fn().mockRejectedValue(notConfirmed()) } })
    type(/email/i, 'new.user@example.com')
    type(/^password/i, 'secret123')
    fireEvent.click(screen.getByRole('button', { name: /^log in$/i }))

    expect(await screen.findByText(/this email isn't confirmed yet/i)).toBeTruthy()
    expect(screen.queryByText('Email not confirmed')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: /resend confirmation email/i }))
    await waitFor(() => expect(auth.resendConfirmation).toHaveBeenCalledWith('new.user@example.com'))
    expect(await screen.findByText(/a new confirmation link is on its way/i)).toBeTruthy()
    expect(screen.queryByRole('button', { name: /resend confirmation email/i })).toBeNull()
  })

  it('does not offer a resend for other log-in failures', async () => {
    renderLogin({
      auth: { signIn: vi.fn().mockRejectedValue(Object.assign(new Error('Invalid login credentials'), { status: 400 })) },
    })
    type(/email/i, 'someone@example.com')
    type(/^password/i, 'wrong-password')
    fireEvent.click(screen.getByRole('button', { name: /^log in$/i }))

    expect(await screen.findByText('Invalid login credentials')).toBeTruthy()
    expect(screen.queryByRole('button', { name: /resend confirmation email/i })).toBeNull()
  })

  it('shows a resend failure, such as the email rate limit, in plain words', async () => {
    renderLogin({
      url: '/login?mode=resend',
      auth: { resendConfirmation: vi.fn().mockRejectedValue(Object.assign(new Error('rate'), { status: 429 })) },
    })
    type(/email/i, 'new.user@example.com')
    fireEvent.click(screen.getByRole('button', { name: /send confirmation email/i }))
    expect(await screen.findByText(/too many requests/i)).toBeTruthy()
    expect(screen.getByText('Could Not Send the Email')).toBeTruthy()
  })
})
