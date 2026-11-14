// #196: one-time feedback after a sign-up confirmation link, good or expired.
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { AuthContext } from '../context/authContextValue'
import { saveReturnPath } from '../utils/returnPath'
import AuthLinkNotice from './AuthLinkNotice'

function CurrentPage() {
  const location = useLocation()
  return <output data-testid="page">{location.pathname + location.search}</output>
}

const USER = { id: 'u-1', email: 'new.user@example.com', app_metadata: {}, user_metadata: {} }
const CONFIRMED = { kind: 'confirmed' }
const EXPIRED = { kind: 'error', code: 'otp_expired' }

function renderNotice({ link, pathname = '/', user = null, loading = false, emailLink = null, showPage = false }) {
  return render(
    <MemoryRouter>
      <AuthContext.Provider value={{ user, loading, emailLink }}>
        <AuthLinkNotice link={link} pathname={pathname} />
        {showPage && <CurrentPage />}
      </AuthContext.Provider>
    </MemoryRouter>,
  )
}

afterEach(() => {
  cleanup()
  window.localStorage.clear()
  window.history.replaceState(null, '', '/')
})

describe('AuthLinkNotice: back to the starting page (#196 item 4)', () => {
  it('takes a confirmed user back to the page they signed up from, with the notice on top', () => {
    saveReturnPath('/compare?ids=a,b')
    renderNotice({ link: CONFIRMED, user: USER, showPage: true })
    expect(screen.getByTestId('page').textContent).toBe('/compare?ids=a,b')
    expect(screen.getByText('Email Confirmed')).toBeTruthy()
  })

  it('stays on the page the link opened when no starting page was saved', () => {
    renderNotice({ link: CONFIRMED, user: USER, showPage: true })
    expect(screen.getByTestId('page').textContent).toBe('/')
  })

  it('does not move before the session exists, and keeps the saved page for then', () => {
    saveReturnPath('/my-gadgets')
    renderNotice({ link: CONFIRMED, user: null, loading: true, showPage: true })
    expect(screen.getByTestId('page').textContent).toBe('/')
    expect(window.localStorage.length).toBe(1)
  })

  it('works with an any-browser link (token_hash) once Supabase has accepted it', () => {
    saveReturnPath('/my-gadgets')
    renderNotice({ link: { kind: 'otp', type: 'email' }, user: USER, emailLink: { type: 'email', ok: true }, showPage: true })
    expect(screen.getByTestId('page').textContent).toBe('/my-gadgets')
  })

  it('does not move while the any-browser link is still being checked', () => {
    saveReturnPath('/my-gadgets')
    renderNotice({ link: { kind: 'otp', type: 'email' }, user: null, loading: true, emailLink: null, showPage: true })
    expect(screen.getByTestId('page').textContent).toBe('/')
    expect(window.localStorage.length).toBe(1)
  })

  it('does not move when the link confirmed the email but signed nobody in (another browser)', () => {
    saveReturnPath('/my-gadgets')
    renderNotice({ link: CONFIRMED, user: null, showPage: true })
    expect(screen.getByTestId('page').textContent).toBe('/')
    expect(window.localStorage.length).toBe(1)
  })

  it('does not move for an expired link', () => {
    saveReturnPath('/my-gadgets')
    renderNotice({ link: EXPIRED, showPage: true })
    expect(screen.getByTestId('page').textContent).toBe('/')
  })
})

describe('AuthLinkNotice', () => {
  it('shows nothing when the page was not opened from an email link', () => {
    const { container } = renderNotice({ link: null, user: USER })
    expect(container.innerHTML).toBe('')
  })

  it('says the email is confirmed, with the signed-in address, once the session exists', () => {
    renderNotice({ link: CONFIRMED, user: USER })
    expect(screen.getByText('Email Confirmed')).toBeTruthy()
    expect(screen.getByText('new.user@example.com')).toBeTruthy()
  })

  it('waits for the session before saying the email is confirmed', () => {
    const { container } = renderNotice({ link: CONFIRMED, user: null, loading: true })
    expect(container.innerHTML).toBe('')
  })

  it('says the email is confirmed and offers Log In when the link could not sign in (PKCE, other browser)', () => {
    renderNotice({ link: CONFIRMED, user: null, loading: false })
    expect(screen.getByText('Email Confirmed')).toBeTruthy()
    expect(screen.getByText(/Log in to continue/)).toBeTruthy()
    expect(screen.getByRole('link', { name: /log in/i }).getAttribute('href')).toBe('/login')
  })

  it('can be dismissed', () => {
    renderNotice({ link: CONFIRMED, user: USER })
    fireEvent.click(screen.getByRole('button', { name: /dismiss/i }))
    expect(screen.queryByText('Email Confirmed')).toBeNull()
  })

  it('explains an expired link and offers a new one or logging in', () => {
    renderNotice({ link: EXPIRED })
    expect(screen.getByRole('alert').textContent).toMatch(/expired or was already used/i)
    expect(screen.getByRole('link', { name: /send a new link/i }).getAttribute('href')).toBe('/login?mode=resend')
    expect(screen.getByRole('link', { name: /log in/i }).getAttribute('href')).toBe('/login')
  })

  it('removes the error from the address bar so a refresh does not show it again', () => {
    window.history.replaceState(null, '', '/?ask=x#error=access_denied&error_code=otp_expired&error_description=bad')
    renderNotice({ link: EXPIRED })
    expect(window.location.hash).toBe('')
    expect(window.location.search).toBe('?ask=x')
  })

  it('tells a signed-in user there is nothing to do', () => {
    renderNotice({ link: EXPIRED, user: USER })
    expect(screen.getByText(/already signed in/i)).toBeTruthy()
    expect(screen.queryByRole('link', { name: /send a new link/i })).toBeNull()
  })

  it('leaves a bad reset link to the Reset Password page', () => {
    const { container } = renderNotice({ link: EXPIRED, pathname: '/reset-password' })
    expect(container.innerHTML).toBe('')
  })

  it('any-browser sign-up link: confirmed once Supabase accepted it', () => {
    renderNotice({ link: { kind: 'otp', type: 'email' }, user: USER, emailLink: { type: 'email', ok: true } })
    expect(screen.getByText('Email Confirmed')).toBeTruthy()
  })

  it('any-browser sign-up link: nothing until the check finishes, then expired if refused', () => {
    const { container } = renderNotice({ link: { kind: 'otp', type: 'email' }, emailLink: null })
    expect(container.innerHTML).toBe('')
    cleanup()
    renderNotice({ link: { kind: 'otp', type: 'email' }, emailLink: { type: 'email', ok: false, code: 'otp_expired' } })
    expect(screen.getByText('This Email Link Has Expired or Was Already Used')).toBeTruthy()
  })

  it('leaves an any-browser reset link to the reset page', () => {
    const { container } = renderNotice({ link: { kind: 'otp', type: 'recovery' }, user: USER, emailLink: { type: 'recovery', ok: true } })
    expect(container.innerHTML).toBe('')
  })
})

