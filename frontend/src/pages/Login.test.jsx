// #196: resend the sign-up confirmation email, from ?mode=resend or after "Email not confirmed".
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
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
  const u = new URL(url, 'http://localhost')
  const entry = from ? { pathname: u.pathname, search: u.search, state: { from } } : url
  render(
    <MemoryRouter initialEntries={[entry]}>
      <AuthContext.Provider value={value}>
        <Login />
      </AuthContext.Provider>
    </MemoryRouter>,
  )
  return value
}

function Where() {
  return <output data-testid="where">{useLocation().pathname}</output>
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
    type(/^password/i, 'Long-enough-1')
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

  it('ignores a starting page that is the log-in page itself', async () => {
    const signIn = vi.fn().mockResolvedValue({ app_metadata: {} })
    render(
      <MemoryRouter initialEntries={[{ pathname: '/login', state: { from: { pathname: '/login', search: '?mode=signup' } } }]}>
        <AuthContext.Provider value={{ signIn, signUp: vi.fn(), resendConfirmation: vi.fn() }}>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="*" element={<Where />} />
          </Routes>
        </AuthContext.Provider>
      </MemoryRouter>,
    )
    type(/email/i, 'member@example.com')
    type(/^password/i, 'Long-enough-1')
    fireEvent.click(screen.getByRole('button', { name: 'Log In' }))
    // A member with no usable starting page lands on My Gadgets, not back on Log In.
    expect((await screen.findByTestId('where')).textContent).toBe('/my-gadgets')
  })

  it('saves nothing when the user opened Log In directly', async () => {
    renderLogin({ url: '/login?mode=signup', auth: { signUp: signUpSent() } })
    type(/email/i, 'new.user@example.com')
    type(/^password/i, 'Long-enough-1')
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
    // Brevo mail from a Gmail sender is often filed as spam, so every "check your email" says where to look.
    expect(screen.getByText(/check your spam folder too/i)).toBeTruthy()
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

describe('Sign-up password rules (14 Nov 2026)', () => {
  it.each(['short1!', 'alllowercase1!', 'ALLUPPERCASE1!', 'NoNumbers!!', 'NoSymbols123'])(
    'blocks the weak password %j with a field error and never calls Supabase',
    (password) => {
      const auth = renderLogin({ url: '/login?mode=signup' })
      type(/email/i, 'new.user@example.com')
      type(/^password/i, password)
      fireEvent.click(screen.getByRole('button', { name: /^sign up$/i }))
      expect(screen.getByText(/^make it stronger/i)).toBeTruthy()
      expect(screen.getByLabelText(/^password/i).getAttribute('aria-invalid')).toBe('true')
      expect(auth.signUp).not.toHaveBeenCalled()
    },
  )

  it('shows the strength meter and signs up once every rule passes', async () => {
    const auth = renderLogin({
      url: '/login?mode=signup',
      auth: { signUp: vi.fn().mockResolvedValue({ user: { identities: [{}] }, session: null }) },
    })
    type(/email/i, 'new.user@example.com')
    type(/^password/i, 'Abcdef1!')
    expect(screen.getByText('Good')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /^sign up$/i }))
    await waitFor(() => expect(auth.signUp).toHaveBeenCalledWith('new.user@example.com', 'Abcdef1!'))
  })

  it('maps Supabase weak_password to a plain sentence', async () => {
    const weak = Object.assign(new Error('Password should contain…'), { code: 'weak_password', reasons: ['characters'] })
    renderLogin({ url: '/login?mode=signup', auth: { signUp: vi.fn().mockRejectedValue(weak) } })
    type(/email/i, 'new.user@example.com')
    type(/^password/i, 'Abcdef1!')
    fireEvent.click(screen.getByRole('button', { name: /^sign up$/i }))
    expect(await screen.findByText(/that password is too weak/i)).toBeTruthy()
    expect(screen.queryByText('Password should contain…')).toBeNull()
  })

  it('does not apply the new rules to Log In (older accounts keep their passwords)', async () => {
    const auth = renderLogin()
    type(/email/i, 'old.user@example.com')
    type(/^password/i, 'secret')
    fireEvent.click(screen.getByRole('button', { name: /^log in$/i }))
    await waitFor(() => expect(auth.signIn).toHaveBeenCalledWith('old.user@example.com', 'secret'))
    expect(screen.queryByText(/password strength/i)).toBeNull()
  })
})
