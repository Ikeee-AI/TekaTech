// Pages are lazy-loaded (App.jsx). After a redeploy, a tab that was opened earlier
// still asks for the old hashed chunk files, which no longer exist, so the import
// fails. These helpers recognise that failure and allow one automatic reload.

// Messages browsers and bundlers use for a failed dynamic import or chunk preload.
const CHUNK_ERROR_PATTERNS = [
  /failed to fetch dynamically imported module/i, // Chrome, Edge
  /error loading dynamically imported module/i, // Firefox
  /importing a module script failed/i, // Safari
  /unable to preload css/i, // Vite CSS preload
  /loading (css )?chunk [\w-]+ failed/i, // webpack-style wording
]

export function isChunkLoadError(error) {
  if (!error) return false
  if (error.name === 'ChunkLoadError') return true
  const message = typeof error === 'string' ? error : error.message
  return typeof message === 'string' && CHUNK_ERROR_PATTERNS.some((pattern) => pattern.test(message))
}

export const AUTO_RELOAD_KEY = 'tekatech:chunk-reload-at'
// A second chunk failure within this window means the reload did not help, so the
// user gets the Reload button instead of a reload loop.
export const AUTO_RELOAD_COOLDOWN_MS = 60_000

/**
 * Returns true (and records the attempt) if an automatic reload is allowed now.
 * Without working sessionStorage it never allows one: no guard means no loop protection.
 */
export function claimAutoReload(storage = globalThis.sessionStorage, now = Date.now()) {
  try {
    const last = Number(storage.getItem(AUTO_RELOAD_KEY))
    if (Number.isFinite(last) && last > 0 && now - last < AUTO_RELOAD_COOLDOWN_MS) return false
    storage.setItem(AUTO_RELOAD_KEY, String(now))
    return true
  } catch {
    return false
  }
}
