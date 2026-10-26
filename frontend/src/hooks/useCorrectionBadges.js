import { useEffect, useState } from 'react'
import { api } from '../api/client'
import { CORRECTIONS_CHANGED_EVENT, getSeenUntil, unseenDecisions } from '../utils/correctionNotices'

const PENDING_POLL_MS = 60_000

/**
 * Navbar badge counts for spec corrections (issue #109):
 * - unseenDecisions: the signed-in user's approved/rejected suggestions they
 *   haven't looked at yet (see utils/correctionNotices.js);
 * - pendingCount: corrections waiting in the admin review queue (admins only).
 *
 * Refreshes on navigation, when the tab becomes visible again and when
 * notifyCorrectionsChanged() fires. Only the cheap admin count is polled, and
 * only while the tab is visible. Badge failures are silent: a missing badge
 * must never break the navbar.
 */
export function useCorrectionBadges(user, pathname) {
  const userId = user?.id ?? null
  const isAdmin = Boolean(user?.app_metadata?.is_admin)
  // Tagged with the user id, so a different account never sees stale counts.
  const [mine, setMine] = useState({ userId: null, items: [] })
  const [pending, setPending] = useState({ userId: null, count: 0 })

  useEffect(() => {
    if (!userId) return undefined
    let cancelled = false

    function refreshPending() {
      if (!isAdmin || document.visibilityState === 'hidden') return
      api
        .getPendingCorrectionCount()
        .then((data) => {
          if (!cancelled) setPending({ userId, count: Number(data?.count) || 0 })
        })
        .catch(() => {})
    }

    function refreshAll() {
      if (document.visibilityState === 'hidden') return
      api
        .getMyCorrections()
        .then((rows) => {
          if (!cancelled) {
            const items = (Array.isArray(rows) ? rows : []).map(({ status, reviewed_at }) => ({ status, reviewed_at }))
            setMine({ userId, items })
          }
        })
        .catch(() => {})
      refreshPending()
    }

    refreshAll()
    const timer = isAdmin ? window.setInterval(refreshPending, PENDING_POLL_MS) : null
    window.addEventListener(CORRECTIONS_CHANGED_EVENT, refreshAll)
    document.addEventListener('visibilitychange', refreshAll)
    return () => {
      cancelled = true
      if (timer) window.clearInterval(timer)
      window.removeEventListener(CORRECTIONS_CHANGED_EVENT, refreshAll)
      document.removeEventListener('visibilitychange', refreshAll)
    }
  }, [userId, isAdmin, pathname])

  const unseen = userId && mine.userId === userId ? unseenDecisions(mine.items, getSeenUntil(userId)).length : 0
  const pendingCount = isAdmin && pending.userId === userId ? pending.count : 0
  return { unseenDecisions: unseen, pendingCount }
}
