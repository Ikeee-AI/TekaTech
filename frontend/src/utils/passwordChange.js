import { MIN_PASSWORD_LENGTH } from './authErrors'

/**
 * Field errors for the Account page's Change Password form (#204); an empty object means valid.
 * The same length rule as sign-up and reset (MIN_PASSWORD_LENGTH).
 */
export function validatePasswordChange({ current, next, confirm }) {
  const errors = {}
  if (!current) errors.current = 'Enter your current password.'
  if (next.length < MIN_PASSWORD_LENGTH) errors.next = `Use at least ${MIN_PASSWORD_LENGTH} characters.`
  else if (current && next === current) errors.next = 'Choose a password that is different from your current one.'
  if (confirm !== next) errors.confirm = "The passwords don't match."
  return errors
}

/** Supabase's answer to a wrong email/password pair when re-checking the current password. */
export function isWrongPassword(err) {
  return err?.code === 'invalid_credentials' || /^invalid login credentials$/i.test(err?.message ?? '')
}
