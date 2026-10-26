// In-app notices for spec corrections (issue #109). No schema change: which
// decisions a user has already seen is remembered per browser in localStorage,
// keyed by user id so two accounts on one browser don't share it.

const SEEN_KEY_PREFIX = 'tekatech:suggestionsSeenUntil:'

// Fired after anything that changes correction counts (submit, approve/reject)
// or marks decisions as seen, so the navbar badges refresh without a reload.
export const CORRECTIONS_CHANGED_EVENT = 'tekatech:corrections-changed'

export function notifyCorrectionsChanged() {
  window.dispatchEvent(new Event(CORRECTIONS_CHANGED_EVENT))
}

/** Latest reviewed_at (server time, ISO) the user has already seen, or null. */
export function getSeenUntil(userId) {
  if (!userId) return null
  try {
    return localStorage.getItem(SEEN_KEY_PREFIX + userId)
  } catch {
    return null
  }
}

function setSeenUntil(userId, iso) {
  try {
    localStorage.setItem(SEEN_KEY_PREFIX + userId, iso)
  } catch {
    // private browsing / storage disabled: the badge just won't remember
  }
}

function time(iso) {
  const t = Date.parse(iso)
  return Number.isNaN(t) ? null : t
}

function isDecided(item) {
  return (item.status === 'approved' || item.status === 'rejected') && time(item.reviewed_at) !== null
}

/** Approved/rejected items reviewed after the user last looked. */
export function unseenDecisions(items, seenUntil) {
  const since = seenUntil ? time(seenUntil) : null
  return items.filter((item) => isDecided(item) && (since === null || time(item.reviewed_at) > since))
}

/**
 * Remember the newest decision in `items` as seen. Uses the server's own
 * reviewed_at rather than the browser clock, so a skewed device clock can't
 * hide or resurrect decisions.
 */
export function markDecisionsSeen(userId, items) {
  if (!userId) return
  const newest = items
    .filter(isDecided)
    .reduce((max, item) => (max === null || time(item.reviewed_at) > time(max) ? item.reviewed_at : max), null)
  const current = getSeenUntil(userId)
  if (newest && (!current || time(current) === null || time(newest) > time(current))) {
    setSeenUntil(userId, newest)
    notifyCorrectionsChanged()
  }
}
