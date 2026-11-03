import { afterEach, describe, expect, it } from 'vitest'
import { authErrorMessage, classifyAuthLink, isEmailNotConfirmed, readAuthLinkError } from './authErrors'

const authError = (fields) => Object.assign(new Error(fields.message ?? ''), fields)

describe('authErrorMessage', () => {
  it('uses the fallback when there is no error or no message', () => {
    expect(authErrorMessage(null)).toBe('Something went wrong. Please try again.')
    expect(authErrorMessage(undefined, 'Could not sign in.')).toBe('Could not sign in.')
    expect(authErrorMessage(authError({}), 'Could not sign in.')).toBe('Could not sign in.')
  })

  it.each([
    ['a retryable fetch error', { name: 'AuthRetryableFetchError' }, /Can't reach the sign-in service/],
    ['a browser "Failed to fetch"', { message: 'Failed to fetch' }, /Can't reach the sign-in service/],
    ['HTTP 429', { status: 429, message: 'Too Many Requests' }, /Too many requests/],
    ['the email send rate limit', { code: 'over_email_send_rate_limit' }, /Too many requests/],
    ['the request rate limit', { code: 'over_request_rate_limit' }, /Too many requests/],
    ['reusing the old password', { code: 'same_password' }, /different from your current one/],
    ['a missing reset session', { name: 'AuthSessionMissingError' }, /reset session has expired/],
    ['an expired session', { code: 'session_expired' }, /reset session has expired/],
    ['a session not found', { code: 'session_not_found' }, /reset session has expired/],
  ])('maps %s to a fixed sentence', (_label, fields, expected) => {
    expect(authErrorMessage(authError(fields))).toMatch(expected)
  })

  it("passes Supabase's own short message through otherwise", () => {
    expect(authErrorMessage(authError({ message: 'Invalid login credentials', status: 400 }))).toBe(
      'Invalid login credentials',
    )
  })
})

describe('readAuthLinkError', () => {
  afterEach(() => {
    window.history.replaceState(null, '', '/')
  })

  it('returns null for a normal URL', () => {
    window.history.replaceState(null, '', '/reset-password')
    expect(readAuthLinkError()).toBeNull()
  })

  it('reads error_code from the hash Supabase redirects with', () => {
    window.history.replaceState(null, '', '/reset-password#error=access_denied&error_code=otp_expired&error_description=x')
    expect(readAuthLinkError()).toBe('otp_expired')
  })

  it('falls back to the bare error param, and to the query string', () => {
    window.history.replaceState(null, '', '/reset-password?error=access_denied')
    expect(readAuthLinkError()).toBe('access_denied')
  })

  it('prefers the hash over the query string', () => {
    window.history.replaceState(null, '', '/reset-password?error_code=from_query#error_code=from_hash')
    expect(readAuthLinkError()).toBe('from_hash')
  })
})

describe('email not confirmed (#196)', () => {
  it.each([
    ['the error code', { code: 'email_not_confirmed', message: 'Email not confirmed', status: 400 }],
    ['only the message', { message: 'Email not confirmed', status: 400 }],
  ])('is recognised from %s and mapped to a plain sentence', (_label, fields) => {
    const err = authError(fields)
    expect(isEmailNotConfirmed(err)).toBe(true)
    expect(authErrorMessage(err)).toBe(
      "This email isn't confirmed yet. Open the link in the confirmation email, or send a new one.",
    )
  })

  it('is not confused with other failures', () => {
    expect(isEmailNotConfirmed(authError({ message: 'Invalid login credentials' }))).toBe(false)
    expect(isEmailNotConfirmed(null)).toBe(false)
  })
})

describe('classifyAuthLink (#196)', () => {
  it('recognises a working sign-up confirmation link', () => {
    expect(classifyAuthLink('#access_token=abc&refresh_token=r&expires_in=3600&token_type=bearer&type=signup')).toEqual({
      kind: 'confirmed',
    })
  })

  it('returns the error code of an expired or used link, from the hash or the query string', () => {
    expect(classifyAuthLink('#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid')).toEqual({
      kind: 'error',
      code: 'otp_expired',
    })
    expect(classifyAuthLink('', '?error=access_denied')).toEqual({ kind: 'error', code: 'access_denied' })
  })

  it('ignores reset links, other sessions and plain URLs', () => {
    expect(classifyAuthLink('#access_token=abc&type=recovery')).toBeNull()
    expect(classifyAuthLink('#type=signup')).toBeNull()
    expect(classifyAuthLink('', '?ask=battery')).toBeNull()
    expect(classifyAuthLink()).toBeNull()
  })
})
