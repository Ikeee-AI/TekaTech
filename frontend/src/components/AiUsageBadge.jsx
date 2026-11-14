import { useEffect, useState } from 'react'
import { Sparkles } from 'lucide-react'
import { api, AI_USAGE_EVENT } from '../api/client'
import { useAuth } from '../hooks/useAuth'

/**
 * "17 of 20 AI questions left today" for signed-in users (owner, 14 Nov 2026: 20 per user
 * per day, admins exempt). Reads GET /me/ai-usage on mount and again after every question
 * (api.askQuestion fires AI_USAGE_EVENT). Admins (limit null) and signed-out visitors see
 * nothing; a failed read hides the badge rather than guessing.
 */
export default function AiUsageBadge({ className = '' }) {
  const { user } = useAuth()
  const [usage, setUsage] = useState(null)

  useEffect(() => {
    if (!user || typeof api.getAiUsage !== 'function') return undefined
    let cancelled = false
    const load = () =>
      api
        .getAiUsage()
        .then((u) => !cancelled && setUsage(u))
        .catch(() => !cancelled && setUsage(null))
    load()
    window.addEventListener(AI_USAGE_EVENT, load)
    return () => {
      cancelled = true
      window.removeEventListener(AI_USAGE_EVENT, load)
    }
  }, [user])

  if (!user || !usage || usage.limit == null || usage.remaining == null) return null
  const out = usage.remaining <= 0
  return (
    <p
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${
        out ? 'border-amber-200 bg-amber-50 text-amber-800' : 'border-slate-200 bg-slate-100 text-slate-700'
      } ${className}`}
    >
      <Sparkles size={12} aria-hidden="true" />
      {out
        ? `No AI questions left today. They reset at 8:00 AM (Manila time).`
        : `${usage.remaining} of ${usage.limit} AI questions left today`}
    </p>
  )
}
