// Plain-language messages for Supabase auth failures (sign in, sign up, password reset).
// Only sentences written here, or Supabase's own short `message` string, reach the
// screen, so a stack trace or raw response body is never displayed.

/** Supabase's default minimum password length; signup (Login.jsx) and reset use the same rule. */
export const MIN_PASSWORD_LENGTH = 6

/** Turns a Supabase AuthError (or a network failure) into a sentence for the user. */
export function authErrorMessage(err, fallback = 'Something went wrong. Please try again.') {
  if (!err) return fallback
  if (err.name === 'AuthRetryableFetchError' || err.message === 'Failed to fetch') {
    return "Can't reach the sign-in service. Check your connection, then try again."
  }
  if (err.status === 429 || err.code === 'over_email_send_rate_limit' || err.code === 'over_request_rate_limit') {
    return 'Too many requests. Wait a minute, then try again.'
  }
  if (err.code === 'same_password') return 'Choose a password that is different from your current one.'
  if (err.name === 'AuthSessionMissingError' || err.code === 'session_not_found' || err.code === 'session_expired') {
    return 'Your reset session has expired. Request a new reset link, then try again.'
  }
  if (isEmailNotConfirmed(err)) {
    return "This email isn't confirmed yet. Open the link in the confirmation email, or send a new one."
  }
  return err.message || fallback
}

/** Logging in before confirming: Supabase answers `email_not_confirmed` ("Email not confirmed"). */
export function isEmailNotConfirmed(err) {
  return err?.code === 'email_not_confirmed' || /^email not confirmed$/i.test(err?.message ?? '')
}

/**
 * What an email link left in the URL it opened (#196):
 * - `{ kind: 'error', code }` for an expired or used link (`?error_code=otp_expired`, or the
 *   same in the hash);
 * - `{ kind: 'confirmed' }` for a working sign-up confirmation link: `?code=…` since the
 *   switch to the PKCE flow (Supabase only issues the code after confirming the address),
 *   or `#access_token=…&type=signup` from a link sent before it;
 * - `null` for anything else, including an old password-reset link (`type=recovery`).
 * A reset link's `?code=…` also returns `confirmed`; callers skip /reset-password and
 * password-recovery sessions (AuthLinkNotice).
 */
export function classifyAuthLink(hash = '', search = '') {
  const fromHash = new URLSearchParams(hash.replace(/^#/, ''))
  const fromQuery = new URLSearchParams(search)
  for (const params of [fromHash, fromQuery]) {
    const code = params.get('error_code') || params.get('error')
    if (code) return { kind: 'error', code }
  }
  // Any-browser email links (14 Nov 2026): ?token_hash=…&type=… is checked by the app itself
  // (verifyOtp, supabaseClient.js); the outcome is only known after that request.
  const otpType = fromQuery.get('token_hash') ? fromQuery.get('type') : null
  if (otpType) return { kind: 'otp', type: otpType }
  if (fromQuery.get('code')) return { kind: 'confirmed' }
  if (fromHash.get('access_token') && fromHash.get('type') === 'signup') return { kind: 'confirmed' }
  return null
}

/** Email-link types verifyOtp accepts for a token_hash link. */
const OTP_TYPES = new Set(['email', 'signup', 'recovery', 'invite', 'email_change', 'magiclink'])

/**
 * A token-hash email link (`?token_hash=…&type=recovery`), or null. These links work in any
 * browser: the app sends the one-time token hash to Supabase (verifyOtp), so nothing depends
 * on a code verifier stored by the browser that asked for the email (as PKCE `?code=` does).
 * The Supabase email templates build them (docs/deploy-runbook.md, "Email link templates").
 */
export function readEmailLinkOtp(search = '') {
  const params = new URLSearchParams(search)
  const tokenHash = params.get('token_hash')
  const type = params.get('type')
  if (!tokenHash || !OTP_TYPES.has(type)) return null
  return { token_hash: tokenHash, type }
}

/**
 * The session tokens of an implicit-flow email link (`#access_token=…&refresh_token=…&type=…`),
 * or null. Links sent before the PKCE switch still have this shape; see utils/authLink.js.
 */
export function readLegacyLinkTokens(hash = '') {
  const params = new URLSearchParams(hash.replace(/^#/, ''))
  const accessToken = params.get('access_token')
  const refreshToken = params.get('refresh_token')
  if (!accessToken || !refreshToken) return null
  return { access_token: accessToken, refresh_token: refreshToken, type: params.get('type') }
}

/**
 * Supabase sends an expired or already-used email link back to the redirect URL with
 * `#error=...&error_code=otp_expired` (or the same in the query string). Returns the
 * error code if present, otherwise null. auth-js leaves these params in the URL on failure.
 */
export function readAuthLinkError() {
  if (typeof window === 'undefined') return null
  const link = classifyAuthLink(window.location.hash, window.location.search)
  return link?.kind === 'error' ? link.code : null
}
