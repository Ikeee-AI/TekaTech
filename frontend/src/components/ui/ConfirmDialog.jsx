import { useEffect, useId, useRef } from 'react'
import { createPortal } from 'react-dom'
import { AlertTriangle } from 'lucide-react'
import Button from './Button'
import Alert from './Alert'

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

function DialogPanel({ title, description, confirmLabel, busy, error, onConfirm, onCancel, children }) {
  const panelRef = useRef(null)
  const cancelRef = useRef(null)
  const titleId = useId()
  const descId = useId()

  // Focus the safe choice (Cancel) on open, and hand focus back to whatever
  // opened the dialog when it closes. Lock page scroll while it is up.
  useEffect(() => {
    const opener = document.activeElement
    cancelRef.current?.focus()
    const { overflow } = document.body.style
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = overflow
      if (opener instanceof HTMLElement) opener.focus()
    }
  }, [])

  function handleKeyDown(e) {
    if (e.key === 'Escape' && !busy) {
      e.stopPropagation()
      onCancel()
      return
    }
    if (e.key !== 'Tab') return
    // Keep Tab / Shift+Tab cycling inside the dialog.
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

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" onKeyDown={handleKeyDown}>
      <div className="absolute inset-0 bg-slate-900/50 animate-fade-in" aria-hidden="true" onClick={busy ? undefined : onCancel} />
      <div
        ref={panelRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        className="relative w-full max-w-md bg-white rounded-xl shadow-2xl border border-slate-200 p-6 animate-fade-in"
      >
        <div className="flex items-start gap-3">
          <span className="shrink-0 w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
            <AlertTriangle size={20} className="text-red-700" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h2 id={titleId} className="text-lg font-bold text-slate-900">
              {title}
            </h2>
            <div id={descId} className="text-sm text-slate-700 mt-1">
              {description}
            </div>
          </div>
        </div>

        {children && <div className="mt-4">{children}</div>}

        {error && (
          <Alert tone="error" className="mt-4">
            {error}
          </Alert>
        )}

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 mt-6">
          <Button ref={cancelRef} variant="secondary" onClick={onCancel} disabled={busy}>
            Cancel
          </Button>
          <Button variant="dangerSolid" onClick={onConfirm} loading={busy}>
            {busy ? 'Deleting…' : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}

/**
 * Confirmation step for destructive actions. Rendered in a portal as a modal
 * alertdialog: focus is trapped inside, Escape and the backdrop cancel (unless
 * the action is in flight), and any server error is shown inline so the user
 * can retry or back out without losing context.
 */
export default function ConfirmDialog({ open, confirmLabel = 'Delete', ...props }) {
  if (!open) return null
  return createPortal(<DialogPanel confirmLabel={confirmLabel} {...props} />, document.body)
}
