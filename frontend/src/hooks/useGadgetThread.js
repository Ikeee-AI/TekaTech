import { useEffect, useState } from 'react'
import { api } from '../api/client'
import { validateAnswerResponse } from '../utils/aiAnswerState'

/** A saved row from GET /me/gadgets/{id}/questions as a ThreadTurn, or null when the
 * stored answer no longer passes the same check a live answer must pass. */
export function toThreadTurn(row) {
  try {
    return { id: row.id, question: row.question, askedAt: row.asked_at, result: validateAnswerResponse(row.response) }
  } catch {
    return null
  }
}

/**
 * A signed-in user's earlier questions about one gadget (user_questions.sql). POST /query
 * saves each single-gadget answer on the server; this hook loads them once per gadget/user
 * and lets the panel append the answer on screen when the user moves on to a new question,
 * so the thread grows without re-fetching. Disabled (empty, no requests) when signed out
 * or when the panel covers more than one gadget.
 */
export function useGadgetThread(gadgetId, userId) {
  const enabled = Boolean(gadgetId && userId)
  const [turns, setTurns] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [clearing, setClearing] = useState(false)

  useEffect(() => {
    let cancelled = false
    // Same fetch-on-change pattern used across the app (see CLAUDE.md "Lint conventions").
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTurns([])
    setError(null)
    if (!enabled) return undefined
    setLoading(true)
    api
      .getGadgetQuestions(gadgetId)
      .then((rows) => {
        if (!cancelled) setTurns((Array.isArray(rows) ? rows : []).map(toThreadTurn).filter(Boolean))
      })
      .catch((err) => {
        if (!cancelled) setError(err)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [enabled, gadgetId, userId])

  // The server already saved this answer when it was returned; mirror it locally.
  function appendTurn(question, result) {
    if (!enabled || !result) return
    setTurns((t) => [...t, { id: `local-${Date.now()}-${t.length}`, question, askedAt: new Date().toISOString(), result }])
  }

  async function clear() {
    if (!enabled) return false
    setClearing(true)
    try {
      await api.clearGadgetQuestions(gadgetId)
      setTurns([])
      setError(null)
      return true
    } catch (err) {
      setError(err)
      return false
    } finally {
      setClearing(false)
    }
  }

  return { enabled, turns, loading, error, clearing, appendTurn, clear }
}
