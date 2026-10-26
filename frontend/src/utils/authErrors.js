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
  return err.message || fallback
}

/**
 * Supabase sends an expired or already-used email link back to the redirect URL with
 * `#error=...&error_code=otp_expired` (or the same in the query string). Returns the
 * error code if present, otherwise null. auth-js leaves these params in the URL on failure.
 */
export function readAuthLinkError() {
  if (typeof window === 'undefined') return null
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''))
  const query = new URLSearchParams(window.location.search)
  for (const params of [hash, query]) {
    const code = params.get('error_code') || params.get('error')
    if (code) return code
  }
  return null
}
