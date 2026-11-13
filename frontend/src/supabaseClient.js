// Must be imported before createClient() runs; see utils/authLink.js.
import { emailLinkOtp, legacyLinkTokens } from './utils/authLink'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Email links (sign-up confirmation, password reset) since 14 Nov 2026 carry a one-time
// `?token_hash=…&type=…` that the app verifies itself (emailLinkSession below), so they work in
// any browser or device. PKCE stays on for sign-in, and for links sent before that change:
// those come back as `?code=…`, which
// supabase-js (detectSessionInUrl, on by default) exchanges for a session using the code
// verifier this browser stored when the email was requested. Session tokens never appear
// in the URL, history or Referer. The link therefore only signs in from the browser that
// asked for it; the Supabase allow list (Auth → URL Configuration → Redirect URLs) must
// contain the frontend origin and /reset-password.
export const supabase = createClient(supabaseUrl, supabaseAnonKey, { auth: { flowType: 'pkce' } })

/**
 * Settles once the session from a pre-PKCE email link (utils/authLink.js) has been stored,
 * with that link's `type` ('signup', 'recovery', …) on success and null otherwise.
 * AuthProvider waits for it before reading the session. Module level, so React's
 * StrictMode double effect can't store the session twice.
 */
export const legacyLinkSession = legacyLinkTokens
  ? supabase.auth
      .setSession({ access_token: legacyLinkTokens.access_token, refresh_token: legacyLinkTokens.refresh_token })
      .then(({ error }) => (error ? null : legacyLinkTokens.type), () => null)
  : Promise.resolve(null)

/**
 * Settles once an any-browser email link (`?token_hash=…`, utils/authLink.js) has been checked
 * with Supabase: `{ type, ok: true }` with the session stored, `{ type, ok: false, code }` for an
 * expired, used or invalid link, or null when the page wasn't opened from such a link.
 * Module level, so React's StrictMode double effect can't spend the one-time token twice.
 */
export const emailLinkSession = emailLinkOtp
  ? supabase.auth
      .verifyOtp({ token_hash: emailLinkOtp.token_hash, type: emailLinkOtp.type })
      .then(
        ({ error }) =>
          error ? { type: emailLinkOtp.type, ok: false, code: error.code || 'otp_invalid' } : { type: emailLinkOtp.type, ok: true },
        () => ({ type: emailLinkOtp.type, ok: false, code: 'network' }),
      )
  : Promise.resolve(null)
