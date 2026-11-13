import { AlertCircle } from 'lucide-react'

const CONTROL =
  'w-full bg-white text-slate-900 placeholder:text-slate-500 border rounded-lg px-3 py-2.5 text-[15px] ' +
  'outline-none transition focus:ring-2'

function controlClass(error) {
  return `${CONTROL} ${
    error
      ? 'border-red-500 focus:border-red-600 focus:ring-red-200'
      : 'border-slate-300 hover:border-slate-400 focus:border-rail-600 focus:ring-rail-200'
  }`
}

/**
 * Label + control + hint + error, wired together for assistive tech:
 * the label is always visible and tied to the control with htmlFor/id,
 * the hint and error are linked through aria-describedby, and an invalid
 * control gets aria-invalid plus a red border AND an icon + message.
 */
function Field({ id, label, required, optional, hint, error, children }) {
  return (
    <div>
      <label htmlFor={id} className="flex items-baseline gap-1.5 text-sm font-semibold text-slate-800 mb-1.5">
        {label}
        {required && (
          <span className="text-red-700" aria-hidden="true">
            *
          </span>
        )}
        {optional && <span className="text-xs font-medium text-slate-500">(Optional)</span>}
      </label>
      {children}
      {hint && !error && (
        <p id={`${id}-hint`} className="text-xs text-slate-600 mt-1.5">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="flex items-start gap-1 text-sm font-medium text-red-700 mt-1.5">
          <AlertCircle size={15} className="shrink-0 mt-0.5" aria-hidden="true" />
          {error}
        </p>
      )}
    </div>
  )
}

function describedBy(id, hint, error) {
  if (error) return `${id}-error`
  if (hint) return `${id}-hint`
  return undefined
}

export function TextField({ id, label, required, optional, hint, error, value, onChange, className = '', ...inputProps }) {
  return (
    <Field id={id} label={label} required={required} optional={optional} hint={hint} error={error}>
      <input
        id={id}
        name={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, hint, error)}
        className={`${controlClass(error)} ${className}`}
        {...inputProps}
      />
    </Field>
  )
}

export function TextAreaField({ id, label, required, optional, hint, error, value, onChange, className = '', ...inputProps }) {
  return (
    <Field id={id} label={label} required={required} optional={optional} hint={hint} error={error}>
      <textarea
        id={id}
        name={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, hint, error)}
        className={`${controlClass(error)} resize-y ${className}`}
        {...inputProps}
      />
    </Field>
  )
}

/** Lists every problem at the top of a form and links each one to its field. */
export function ErrorSummary({ errors, labels, id = 'form-errors' }) {
  const entries = Object.entries(errors).filter(([, message]) => message)
  if (entries.length === 0) return null
  return (
    <div
      id={id}
      role="alert"
      tabIndex={-1}
      className="border border-red-200 bg-red-50 text-red-800 rounded-lg px-3.5 py-3 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
    >
      <p className="flex items-center gap-1.5 font-semibold">
        <AlertCircle size={18} className="text-red-700" aria-hidden="true" />
        Please fix {entries.length === 1 ? 'this field' : `these ${entries.length} fields`}:
      </p>
      <ul className="mt-1.5 ml-6 list-disc space-y-0.5">
        {entries.map(([field, message]) => (
          <li key={field}>
            <a
              href={`#${field}`}
              onClick={(e) => {
                e.preventDefault()
                document.getElementById(field)?.focus()
              }}
              className="underline underline-offset-2 hover:text-red-950 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
            >
              {labels[field] ?? field}: {message}
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}
