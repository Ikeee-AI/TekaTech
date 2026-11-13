import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Inbox, KeyRound, LayoutGrid, ShieldCheck } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../hooks/useAuth'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { TextField } from '../components/ui/FormField'
import Alert from '../components/ui/Alert'
import Button from '../components/ui/Button'
import BackLink from '../components/ui/BackLink'
import { authErrorMessage, MIN_PASSWORD_LENGTH } from '../utils/authErrors'
import { isWrongPassword, validatePasswordChange } from '../utils/passwordChange'

const EMPTY = { current: '', next: '', confirm: '' }
const FIELD_IDS = { current: 'current-password', next: 'new-password', confirm: 'confirm-password' }

function formatDate(value) {
  const date = value ? new Date(value) : null
  if (!date || Number.isNaN(date.getTime())) return null
  return date.toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })
}

/**
 * The signed-in user's account page (#204): email, links to their lists, and Change Password.
 * Changing the password asks for the current one first, so someone at an unattended,
 * signed-in browser can't take the account over. Behind ProtectedRoute in App.jsx.
 */
export default function Account() {
  useDocumentTitle('Your Account')
  const { user, signIn, updatePassword } = useAuth()
  const [values, setValues] = useState(EMPTY)
  const [fieldErrors, setFieldErrors] = useState({})
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [changed, setChanged] = useState(false)

  const isAdmin = user?.app_metadata?.is_admin === true
  const createdOn = formatDate(user?.created_at)

  const update = (field) => (value) => {
    setValues((v) => ({ ...v, [field]: value }))
    setFieldErrors((prev) => ({ ...prev, [field]: undefined }))
    setError(null)
    setChanged(false)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setChanged(false)
    const errors = validatePasswordChange(values)
    setFieldErrors(errors)
    const firstInvalid = ['current', 'next', 'confirm'].find((f) => errors[f])
    if (firstInvalid) {
      document.getElementById(FIELD_IDS[firstInvalid])?.focus()
      return
    }
    setSubmitting(true)
    try {
      // Re-check the current password by signing in again with it (same account, fresh session).
      try {
        await signIn(user.email, values.current)
      } catch (err) {
        if (isWrongPassword(err)) {
          setFieldErrors({ current: 'Your current password is incorrect.' })
          document.getElementById(FIELD_IDS.current)?.focus()
          return
        }
        throw err
      }
      await updatePassword(values.next)
      setValues(EMPTY)
      setChanged(true)
      toast.success('Password updated')
    } catch (err) {
      setError(authErrorMessage(err, "We couldn't update your password. Please try again."))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <BackLink to="/my-gadgets">Back to My Gadgets</BackLink>

      <section aria-labelledby="account-title" className="bg-white border border-gray-200 rounded-xl p-6">
        <h1 id="account-title" className="font-display text-xl font-bold text-gray-900">
          Your Account
        </h1>
        <dl className="mt-4 grid grid-cols-1 sm:grid-cols-[8rem_1fr] gap-x-4 gap-y-2 text-sm">
          <dt className="text-slate-600">Email</dt>
          <dd className="font-semibold text-slate-900 break-all">{user.email}</dd>
          {createdOn && (
            <>
              <dt className="text-slate-600">Member since</dt>
              <dd className="text-slate-900">{createdOn}</dd>
            </>
          )}
          <dt className="text-slate-600">Role</dt>
          <dd className="text-slate-900">
            {isAdmin ? (
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck size={16} aria-hidden="true" className="text-rail-700" /> Admin (curates the catalog)
              </span>
            ) : (
              'Member (suggests corrections, keeps a My Gadgets list)'
            )}
          </dd>
        </dl>
        <div className="mt-5 flex flex-wrap gap-2">
          <Button as={Link} to="/my-gadgets" size="sm" icon={LayoutGrid}>
            My Gadgets
          </Button>
          <Button as={Link} to="/my-suggestions" size="sm" icon={Inbox}>
            My Suggestions
          </Button>
        </div>
      </section>

      <section aria-labelledby="password-title" className="bg-white border border-gray-200 rounded-xl p-6">
        <h2 id="password-title" className="font-display text-lg font-bold text-gray-900 mb-1">
          Change Password
        </h2>
        <p className="text-sm text-slate-600 mb-4">Enter your current password first, then the new one twice.</p>
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          {/* Lets password managers attach the new password to the right account. */}
          <input type="email" name="username" autoComplete="username" value={user.email ?? ''} readOnly hidden />
          <TextField
            id={FIELD_IDS.current}
            label="Current Password"
            type="password"
            required
            autoComplete="current-password"
            error={fieldErrors.current}
            value={values.current}
            onChange={update('current')}
          />
          <TextField
            id={FIELD_IDS.next}
            label="New Password"
            type="password"
            required
            autoComplete="new-password"
            hint={`At least ${MIN_PASSWORD_LENGTH} characters.`}
            error={fieldErrors.next}
            value={values.next}
            onChange={update('next')}
          />
          <TextField
            id={FIELD_IDS.confirm}
            label="Confirm New Password"
            type="password"
            required
            autoComplete="new-password"
            error={fieldErrors.confirm}
            value={values.confirm}
            onChange={update('confirm')}
          />
          <div aria-live="polite">
            {error && (
              <Alert tone="error" title="Password Not Updated">
                {error}
              </Alert>
            )}
            {changed && (
              <Alert tone="success" title="Password Updated">
                Use your new password the next time you log in.
              </Alert>
            )}
          </div>
          <Button type="submit" variant="primary" size="lg" icon={KeyRound} loading={submitting} className="w-full">
            {submitting ? 'Please Wait…' : 'Update Password'}
          </Button>
        </form>
      </section>
    </div>
  )
}
