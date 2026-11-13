// utils/authLink.js reads the URL once, at import time, so each test sets the URL and
// then imports a fresh copy of the module.
import { afterEach, describe, expect, it, vi } from 'vitest'

async function loadAt(url) {
  window.history.replaceState(null, '', url)
  vi.resetModules()
  return import('./authLink')
}

afterEach(() => {
  window.history.replaceState(null, '', '/')
})

describe('authLink', () => {
  it('records a PKCE confirmation link and removes its code afterwards, keeping other params', async () => {
    const link = await loadAt('/?ask=battery&code=7f3a9c&sb_flow_id=f1')
    expect(link.initialAuthLink).toEqual({ kind: 'confirmed' })
    expect(link.legacyLinkTokens).toBeNull()
    link.clearAuthCodeFromUrl()
    expect(window.location.search).toBe('?ask=battery')
  })

  it('records a PKCE reset link on /reset-password', async () => {
    const link = await loadAt('/reset-password?code=abc')
    expect(link.initialPathname).toBe('/reset-password')
    link.clearAuthCodeFromUrl()
    expect(window.location.pathname).toBe('/reset-password')
    expect(window.location.search).toBe('')
  })

  it('leaves the URL alone when the page was not opened with a code', async () => {
    const link = await loadAt('/compare?ids=1,2')
    window.history.replaceState(null, '', '/compare?ids=1,2&code=later')
    link.clearAuthCodeFromUrl()
    expect(window.location.search).toBe('?ids=1,2&code=later')
  })

  it('takes the tokens of a pre-PKCE link out of the address bar before supabase-js reads it', async () => {
    const link = await loadAt('/?x=1#access_token=a1&refresh_token=r1&expires_in=3600&token_type=bearer&type=signup')
    expect(link.initialAuthLink).toEqual({ kind: 'confirmed' })
    expect(link.legacyLinkTokens).toEqual({ access_token: 'a1', refresh_token: 'r1', type: 'signup' })
    expect(window.location.hash).toBe('')
    expect(window.location.search).toBe('?x=1')
  })

  it('keeps an error hash for the notice, and takes no tokens', async () => {
    const link = await loadAt('/#error=access_denied&error_code=otp_expired')
    expect(link.initialAuthLink).toEqual({ kind: 'error', code: 'otp_expired' })
    expect(link.legacyLinkTokens).toBeNull()
    expect(window.location.hash).toBe('#error=access_denied&error_code=otp_expired')
  })
})
