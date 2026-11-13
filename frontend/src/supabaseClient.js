// Must be imported before createClient() runs; see utils/authLink.js.
import { legacyLinkTokens } from './utils/authLink'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// PKCE: email links (sign-up confirmation, password reset) come back as `?code=…`, which
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
