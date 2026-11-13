import { classifyAuthLink, readLegacyLinkTokens } from './authErrors'

// Read once, when the app first loads. supabaseClient.js imports this module, so it runs
// before createClient(): supabase-js exchanges a confirmation or reset link's `?code=…`
// for a session and then removes it from the URL, so later code can no longer tell that
// the page was opened from that email (#196).

/** What the email link that opened this page left in the URL; see classifyAuthLink(). */
export const initialAuthLink =
  typeof window === 'undefined' ? null : classifyAuthLink(window.location.hash, window.location.search)

/** The path the page was opened on (a reset link opens /reset-password, which has its own message). */
export const initialPathname = typeof window === 'undefined' ? '/' : window.location.pathname

/** True when the page was opened with a PKCE `?code=…` (cleared by clearAuthCodeFromUrl()). */
const openedWithCode = typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('code')

/**
 * Session tokens from an email link sent before the switch to the PKCE flow
 * (`#access_token=…&refresh_token=…`), or null. supabase-js in PKCE mode rejects that
 * shape ("Not a valid PKCE flow url") and leaves the tokens in the address bar, so they
 * are taken out here, before createClient() reads the URL, and supabaseClient.js stores
 * them with setSession(). Supabase email links expire within 24 hours, so this branch
 * can be removed a day or two after the PKCE release.
 */
export const legacyLinkTokens = typeof window === 'undefined' ? null : takeLegacyLinkTokens()

function takeLegacyLinkTokens() {
  const tokens = readLegacyLinkTokens(window.location.hash)
  if (tokens) {
    const url = new URL(window.location.href)
    url.hash = ''
    window.history.replaceState(window.history.state, '', url)
  }
  return tokens
}

/**
 * Removes a PKCE `?code=…` the page was opened with. supabase-js removes it after a
 * successful exchange; this also covers a failed one (for example a link opened in a
 * different browser, which has no code verifier), so a refresh doesn't retry a dead code.
 */
export function clearAuthCodeFromUrl() {
  if (!openedWithCode) return
  const url = new URL(window.location.href)
  if (!url.searchParams.has('code') && !url.searchParams.has('sb_flow_id')) return
  url.searchParams.delete('code')
  url.searchParams.delete('sb_flow_id')
  window.history.replaceState(window.history.state, '', url)
}

/**
 * Sends a password-recovery session to the reset form. A reset link normally opens
 * /reset-password already; if Supabase fell back to the Site URL (redirect not on its
 * allow list) the user would otherwise be silently signed in on the catalog. A full page
 * load to a fixed same-origin path: the session is already stored, and ResetPassword
 * reads it from there.
 */
export function openResetForm() {
  if (window.location.pathname !== '/reset-password') window.location.replace('/reset-password')
}
