import { AlertCircle, CheckCircle2, Info, AlertTriangle } from 'lucide-react'

const TONES = {
  error: { icon: AlertCircle, box: 'bg-red-50 border-red-200 text-red-800', iconColor: 'text-red-700' },
  success: { icon: CheckCircle2, box: 'bg-emerald-50 border-emerald-200 text-emerald-900', iconColor: 'text-emerald-700' },
  warning: { icon: AlertTriangle, box: 'bg-amber-50 border-amber-200 text-amber-900', iconColor: 'text-amber-700' },
  info: { icon: Info, box: 'bg-slate-50 border-slate-200 text-slate-700', iconColor: 'text-slate-500' },
}

/**
 * Inline message box. Errors use role="alert" so screen readers announce them
 * as soon as they appear; other tones use role="status" (polite).
 * Every tone pairs its color with an icon and text, never color alone.
 */
export default function Alert({ tone = 'info', title, children, action, className = '', id }) {
  const { icon: Icon, box, iconColor } = TONES[tone]
  return (
    <div
      id={id}
      role={tone === 'error' ? 'alert' : 'status'}
      className={`flex items-start gap-2.5 border rounded-lg px-3.5 py-3 text-sm ${box} ${className}`}
    >
      <Icon size={18} className={`shrink-0 mt-px ${iconColor}`} aria-hidden="true" />
      <div className="min-w-0 flex-1">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className={title ? 'mt-0.5' : ''}>{children}</div>}
        {action && <div className="mt-2.5">{action}</div>}
      </div>
    </div>
  )
}
