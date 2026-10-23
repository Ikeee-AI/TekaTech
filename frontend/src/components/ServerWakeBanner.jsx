import { useEffect, useState, useSyncExternalStore } from 'react'
import { Loader2 } from 'lucide-react'
import { subscribe, getWakingSince } from '../api/serverStatus'

const EXPECTED_SECONDS = 45

function ElapsedNote({ since }) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [])
  const seconds = Math.max(0, Math.round((now - since) / 1000))
  return (
    <span className="text-sky-800">
      {seconds < EXPECTED_SECONDS
        ? ` Waiting ${seconds} s…`
        : ` Still waiting (${seconds} s). If nothing loads soon, refresh the page.`}
    </span>
  )
}

/**
 * Shown while the free-tier API is cold-starting (see api/serverStatus.js), so a slow
 * first load reads as "waking up" rather than broken. Announced politely once.
 */
export default function ServerWakeBanner() {
  const since = useSyncExternalStore(subscribe, getWakingSince)
  if (!since) return null
  return (
    <div role="status" className="bg-sky-50 border-b border-sky-200 animate-fade-in">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-3 flex items-start gap-2.5 text-sm text-sky-900">
        <Loader2 size={18} className="shrink-0 mt-px animate-spin text-sky-700" aria-hidden="true" />
        <p>
          <strong className="font-semibold">The server is waking up.</strong> The first load after a quiet period can take
          up to {EXPECTED_SECONDS} seconds. Everything will appear here once it&apos;s ready.
          <ElapsedNote since={since} />
        </p>
      </div>
    </div>
  )
}
