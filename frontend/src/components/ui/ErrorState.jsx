import { AlertTriangle, RefreshCw } from 'lucide-react'
import Button from './Button'

/**
 * Full-panel error for a screen whose data failed to load. Announced with
 * role="alert", always offers a way forward (retry and/or a secondary action).
 */
export default function ErrorState({ title = 'Something Went Wrong', message, onRetry, secondaryAction }) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center justify-center text-center bg-white border border-slate-200 rounded-xl py-14 px-6"
    >
      <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-4">
        <AlertTriangle size={22} className="text-red-700" aria-hidden="true" />
      </div>
      <h2 className="text-lg font-bold text-slate-900">{title}</h2>
      {message && <p className="text-sm text-slate-600 mt-1 max-w-sm">{message}</p>}
      {(onRetry || secondaryAction) && (
        <div className="flex flex-wrap justify-center gap-2 mt-5">
          {onRetry && (
            <Button variant="primary" icon={RefreshCw} onClick={onRetry}>
              Try Again
            </Button>
          )}
          {secondaryAction}
        </div>
      )}
    </div>
  )
}
