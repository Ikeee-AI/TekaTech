// Password rules for every place a password is created or changed: sign-up (Login.jsx),
// the reset form (ResetPassword.jsx) and Change Password (Account.jsx, via passwordChange.js).
// Owner decision, 14 Nov 2026. The Supabase Auth password policy is set to the same rules
// (minimum length 8; "Lowercase, uppercase letters, digits and symbols"), so the server
// rejects what this file rejects; authErrorMessage maps its `weak_password` answer.
//
// Supabase counts only ASCII letters and digits, and only the symbols listed in SYMBOLS,
// so the checks below use exactly those sets: a password that passes here passes there.

export const MIN_PASSWORD_LENGTH = 8
/** Length that earns the top "Strong" score once every rule is met. */
export const STRONG_PASSWORD_LENGTH = 12

const SYMBOLS = "!@#$%^&*()_+-=[]{};'\\:\"|<>?,./`~"

/** One short sentence for the field hint (and screen readers, via aria-describedby). */
export const PASSWORD_HINT = `At least ${MIN_PASSWORD_LENGTH} characters, with an uppercase and a lowercase letter, a number and a symbol.`

export const PASSWORD_RULES = [
  {
    id: 'length',
    label: `At least ${MIN_PASSWORD_LENGTH} characters`,
    missing: `use at least ${MIN_PASSWORD_LENGTH} characters`,
    test: (pw) => pw.length >= MIN_PASSWORD_LENGTH,
  },
  { id: 'lower', label: 'A lowercase letter (a–z)', missing: 'add a lowercase letter', test: (pw) => /[a-z]/.test(pw) },
  { id: 'upper', label: 'An uppercase letter (A–Z)', missing: 'add an uppercase letter', test: (pw) => /[A-Z]/.test(pw) },
  { id: 'number', label: 'A number (0–9)', missing: 'add a number', test: (pw) => /[0-9]/.test(pw) },
  {
    id: 'symbol',
    label: 'A symbol, such as ! @ # ? or -',
    missing: 'add a symbol such as ! or #',
    test: (pw) => [...pw].some((ch) => SYMBOLS.includes(ch)),
  },
]

/** Index = score (0–4). */
export const STRENGTH_LABELS = ['Too weak', 'Weak', 'Fair', 'Good', 'Strong']

/**
 * Checks a password against every rule and scores it 0–4:
 * - 4 Strong: every rule met and at least STRONG_PASSWORD_LENGTH characters;
 * - 3 Good: every rule met;
 * - 2 Fair: four rules met; 1 Weak: two or three; 0 Too weak: none or one.
 * Only Good and Strong are `valid`, so the label never says "Good" for a password the
 * form would still refuse.
 */
export function checkPassword(password = '') {
  const rules = PASSWORD_RULES.map(({ id, label, missing, test }) => ({ id, label, missing, met: test(password) }))
  const met = rules.filter((r) => r.met).length
  const valid = met === rules.length
  let score
  if (valid) score = password.length >= STRONG_PASSWORD_LENGTH ? 4 : 3
  else if (met >= 4) score = 2
  else if (met >= 2) score = 1
  else score = 0
  return { rules, met, valid, score, label: STRENGTH_LABELS[score] }
}

function joinList(items) {
  if (items.length <= 1) return items.join('')
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`
}

/**
 * The field error for a new password, or null when every rule passes. Names exactly what is
 * missing, e.g. "Make it stronger: add a number and add a symbol such as ! or #."
 */
export function passwordError(password = '') {
  const { rules, valid } = checkPassword(password)
  if (valid) return null
  if (!password) return 'Enter a password.'
  return `Make it stronger: ${joinList(rules.filter((r) => !r.met).map((r) => r.missing))}.`
}
