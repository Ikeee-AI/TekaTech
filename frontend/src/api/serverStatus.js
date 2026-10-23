// Tracks whether the API is probably cold-starting, so the UI can say "the server is
// waking up" instead of looking stuck. The free Render host sleeps after ~15 minutes
// idle and its first request took 42.5 s to answer in Consultation 2.
//
// "Waking" = a request has been waiting longer than SLOW_MS and the API hasn't
// answered recently (never this session, or not for IDLE_MS). Once any response
// arrives, the server is awake again.

const SLOW_MS = 4_000
const IDLE_MS = 10 * 60 * 1000

let pending = 0
let lastResponseAt = 0
let waking = false
let wakingSince = 0
const listeners = new Set()

function setWaking(next) {
  if (next === waking) return
  waking = next
  // Count from when the user started waiting, not from when the banner appeared.
  wakingSince = next ? Date.now() - SLOW_MS : 0
  listeners.forEach((fn) => fn())
}

// AI questions are slow even on a warm server (two provider calls, retries), and
// the answer panel has its own "still working" note, so they never mean "waking".
function isColdStartSignal(path) {
  return !path.startsWith('/query')
}

/** Call when a request starts; call the returned function once it settles (success or error). */
export function trackRequest(path = '') {
  if (!isColdStartSignal(path)) {
    // Never shows the banner, but a reply still proves the server is awake.
    return (gotResponse) => {
      if (gotResponse) lastResponseAt = Date.now()
    }
  }
  pending += 1
  const coldLikely = Date.now() - lastResponseAt > IDLE_MS
  const timer = coldLikely ? setTimeout(() => setWaking(true), SLOW_MS) : null
  let settled = false
  return function settle(gotResponse) {
    if (settled) return
    settled = true
    clearTimeout(timer)
    pending -= 1
    if (gotResponse) lastResponseAt = Date.now()
    if (gotResponse || pending === 0) setWaking(false)
  }
}

export function subscribe(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export function getWakingSince() {
  return wakingSince
}
