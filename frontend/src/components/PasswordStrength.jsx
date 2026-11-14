import { Check, Circle } from 'lucide-react'
import { checkPassword } from '../utils/passwordStrength'

// Per score (0–4): filled bar colour and label text colour. Theme tokens, so both read in
// dark (default) and light mode: red / amber / sage (the accent).
const TONES = [
  { bar: 'bg-red-600', text: 'text-red-700' },
  { bar: 'bg-red-600', text: 'text-red-700' },
  { bar: 'bg-amber-500', text: 'text-amber-700' },
  { bar: 'bg-sage-600', text: 'text-sage-700' },
  { bar: 'bg-sage-600', text: 'text-sage-700' },
]

/**
 * Strength meter for a new-password field: a 4-segment bar, a text label ("Too weak" …
 * "Strong") and the five rules with met/unmet state. State is never colour alone: each rule
 * has an icon and a hidden "met"/"not met", and the label says the score in words.
 * Only the label is a live region: it changes at a few thresholds, not on every keystroke,
 * so screen readers hear "Fair", "Good" … rather than the whole checklist again.
 * Rules and scoring live in utils/passwordStrength.js.
 */
export default function PasswordStrength({ password, id = 'password-strength' }) {
  const { rules, score, label } = checkPassword(password)
  const typed = password.length > 0
  const tone = TONES[score]
  // Too weak shows no filled segment; Weak 1, Fair 2, Good 3, Strong 4.
  const filled = typed ? score : 0

  return (
    <div id={id} className="mt-2">
      <div className="flex items-center gap-3">
        <div className="flex flex-1 gap-1" aria-hidden="true">
          {[1, 2, 3, 4].map((segment) => (
            <span
              key={segment}
              data-filled={segment <= filled ? 'true' : 'false'}
              className={`h-1.5 flex-1 rounded-full transition-colors ${segment <= filled ? tone.bar : 'bg-slate-200'}`}
            />
          ))}
        </div>
        <p aria-live="polite" className={`text-xs font-semibold min-w-16 text-right ${typed ? tone.text : 'text-slate-600'}`}>
          {typed ? (
            <>
              <span className="sr-only">Password strength: </span>
              {label}
            </>
          ) : null}
        </p>
      </div>
      <ul aria-label="Rules your password must meet" className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-1">
        {rules.map((rule) => (
          <li
            key={rule.id}
            data-rule={rule.id}
            data-met={rule.met ? 'true' : 'false'}
            className={`flex items-start gap-1.5 text-xs ${rule.met ? 'text-slate-800' : 'text-slate-600'}`}
          >
            {rule.met ? (
              <Check size={14} strokeWidth={3} className="shrink-0 mt-px text-sage-700" aria-hidden="true" />
            ) : (
              <Circle size={14} className="shrink-0 mt-px text-slate-500" aria-hidden="true" />
            )}
            <span>
              {rule.label}
              <span className="sr-only">{rule.met ? ' (met)' : ' (not met)'}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
