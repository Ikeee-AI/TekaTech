// #196: the page a new user signed up from, kept in this browser until they click the
// confirmation link, so they come back to it instead of the catalog. The link itself still
// opens the site's home page (emailRedirectTo stays the bare origin), so Supabase's Redirect
// URLs allow list doesn't need every page of the site.

const KEY = 'tekatech.returnAfterConfirm'
// Supabase confirmation links expire after 24 hours by default; an older path is no use.
const MAX_AGE_MS = 24 * 60 * 60 * 1000
// Pages that make no sense to return to after confirming: the log-in and password pages, and
// admin-only pages (App.jsx), where a newly confirmed account is never an admin and would be
// bounced to the catalog.
const SKIP = ['/login', '/forgot-password', '/reset-password', '/add', '/corrections']
const SKIP_PATTERNS = [/^\/gadgets\/[^/]+\/edit\/?$/]

/** A same-site path such as "/compare?ids=1,2", or null for anything else. */
export function safePath(path) {
  if (typeof path !== 'string' || !path.startsWith('/') || path.startsWith('//') || path.includes('\\')) return null
  let url
  try {
    url = new URL(path, window.location.origin)
  } catch {
    return null
  }
  if (url.origin !== window.location.origin || SKIP.includes(url.pathname)) return null
  if (SKIP_PATTERNS.some((pattern) => pattern.test(url.pathname))) return null
  return url.pathname + url.search + url.hash
}

/** Remembers `from` (a router location or a path) for the confirmation link. */
export function saveReturnPath(from, now = Date.now()) {
  const raw = typeof from === 'string' ? from : from ? `${from.pathname ?? ''}${from.search ?? ''}${from.hash ?? ''}` : null
  const path = safePath(raw)
  if (!path) return
  try {
    window.localStorage.setItem(KEY, JSON.stringify({ path, savedAt: now }))
  } catch {
    // Storage blocked (private mode, settings): the user just lands on the catalog as before.
  }
}

/** Returns the saved path once (and forgets it), or null if none, too old or not safe. */
export function takeReturnPath(now = Date.now()) {
  let stored
  try {
    stored = window.localStorage.getItem(KEY)
    window.localStorage.removeItem(KEY)
  } catch {
    return null
  }
  if (!stored) return null
  try {
    const { path, savedAt } = JSON.parse(stored)
    if (typeof savedAt !== 'number' || now - savedAt > MAX_AGE_MS || now < savedAt) return null
    return safePath(path)
  } catch {
    return null
  }
}
