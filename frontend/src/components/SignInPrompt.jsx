import { useEffect, useId, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Link, useLocation } from 'react-router-dom'
import { LogIn, UserPlus, Lock } from 'lucide-react'
import Button from './ui/Button'

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex="-1"])'

function PromptPanel({ onClose }) {
  const location = useLocation()
  const panelRef = useRef(null)
  const loginRef = useRef(null)
  const titleId = useId()
  const descId = useId()

  // Same behaviour as ConfirmDialog: focus the first action on open, hand focus back to the
  // control that opened the prompt when it closes, and lock page scroll while it is up.
  useEffect(() => {
    const opener = document.activeElement
    loginRef.current?.focus()
    const { overflow } = document.body.style
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = overflow
      if (opener instanceof HTMLElement && opener.isConnected) opener.focus()
    }
  }, [])

  function handleKeyDown(e) {
    if (e.key === 'Escape') {
      e.stopPropagation()
      onClose()
      return
    }
    if (e.key !== 'Tab') return
    const items = [...panelRef.current.querySelectorAll(FOCUSABLE)]
    if (items.length === 0) return
    const first = items[0]
    const last = items[items.length - 1]
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault()
      last.focus()
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault()
      first.focus()
    }
  }

  // Login sends the user back to `from` after signing in, so they land on the catalog they left.
  const state = { from: location }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" onKeyDown={handleKeyDown}>
      <div className="absolute inset-0 bg-slate-900/50 animate-fade-in" aria-hidden="true" onClick={onClose} />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 p-6 animate-fade-in"
      >
        <div className="flex items-start gap-3">
          <span className="shrink-0 w-10 h-10 rounded-full bg-sage-700 text-white flex items-center justify-center">
            <Lock size={18} aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h2 id={titleId} className="text-lg font-bold text-slate-900">
              Sign in to continue
            </h2>
            <p id={descId} className="text-sm text-slate-700 mt-1">
              Create a free account to view specs, compare phones and ask the AI.
            </p>
          </div>
        </div>
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 mt-6">
          <Button variant="ghost" onClick={onClose}>
            Not now
          </Button>
          <Button as={Link} to="/login?mode=signup" state={state} variant="secondary" icon={UserPlus}>
            Create account
          </Button>
          <Button ref={loginRef} as={Link} to="/login" state={state} variant="primary" icon={LogIn}>
            Log in
          </Button>
        </div>
      </div>
    </div>
  )
}

/**
 * Shown when a signed-out visitor uses a members-only control on the catalog
 * (View specs, Compare, Ask AI, Save, a phone name). Modal dialog in a portal:
 * focus is trapped, Escape / the backdrop / "Not now" close it.
 */
export default function SignInPrompt({ open, onClose }) {
  if (!open) return null
  return createPortal(<PromptPanel onClose={onClose} />, document.body)
}
