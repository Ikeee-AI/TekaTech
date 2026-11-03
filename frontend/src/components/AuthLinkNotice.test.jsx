// #196: one-time feedback after a sign-up confirmation link, good or expired.
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AuthContext } from '../context/authContextValue'
import AuthLinkNotice from './AuthLinkNotice'

const USER = { id: 'u-1', email: 'new.user@example.com', app_metadata: {}, user_metadata: {} }
const CONFIRMED = { kind: 'confirmed' }
const EXPIRED = { kind: 'error', code: 'otp_expired' }

function renderNotice({ link, pathname = '/', user = null, loading = false }) {
  return render(
    <MemoryRouter>
      <AuthContext.Provider value={{ user, loading }}>
        <AuthLinkNotice link={link} pathname={pathname} />
      </AuthContext.Provider>
    </MemoryRouter>,
  )
}

afterEach(() => {
  cleanup()
  window.history.replaceState(null, '', '/')
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
})
