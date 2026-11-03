import { classifyAuthLink } from './authErrors'

// Read once, when the app first loads. supabaseClient.js imports this module, so it runs
// before createClient(): supabase-js signs the user in from a confirmation link's
// `#access_token=…&type=signup` and then clears the hash, so later code can no longer
// tell that the page was opened from that email (#196).

/** What the email link that opened this page left in the URL; see classifyAuthLink(). */
export const initialAuthLink =
  typeof window === 'undefined' ? null : classifyAuthLink(window.location.hash, window.location.search)

/** The path the page was opened on (a reset link opens /reset-password, which has its own message). */
export const initialPathname = typeof window === 'undefined' ? '/' : window.location.pathname
