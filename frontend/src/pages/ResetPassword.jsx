import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { KeyRound, Mail } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../hooks/useAuth'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { TextField } from '../components/ui/FormField'
import Alert from '../components/ui/Alert'
import Button from '../components/ui/Button'
import BackLink from '../components/ui/BackLink'
import { authErrorMessage, MIN_PASSWORD_LENGTH, readAuthLinkError } from '../utils/authErrors'

function Card({ title, children }) {
  return (
    <div className="max-w-sm mx-auto">
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h1 className="font-display text-xl font-bold text-gray-900 mb-1">{title}</h1>
        {children}
      </div>
      <div className="text-center mt-4">
        <BackLink to="/login">Back to Log In</BackLink>
      </div>
    </div>
  )
}

/**
 * Landing page for the password-reset email link.
 *
 * supabase-js parses the link's tokens from the URL while the client initialises and
 * stores a recovery session before AuthProvider's getSession() resolves, so once
 * `loading` is false a valid link shows up here as a signed-in `user`. That is more
 * reliable than catching the PASSWORD_RECOVERY event, which fires on a timer and can
 * run before this page mounts. An expired or reused link instead leaves
 * `#error_code=otp_expired` (or similar) in the URL and creates no session.
 */
export default function ResetPassword() {
  useDocumentTitle('Set a New Password')
  const { user, loading, updatePassword } = useAuth()
  const navigate = useNavigate()

  const [linkError] = useState(readAuthLinkError)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  if (loading && !linkError) {
    return (
      <Card title="Set a New Password">
        <p role="status" className="text-sm text-slate-600 animate-pulse">
          Checking your reset link…
        </p>
      </Card>
    )
  }

  if (linkError || !user) {
    return (
      <Card title="Reset Link Not Valid">
        <Alert tone="error" title="This reset link is invalid or has expired." className="mt-3">
          Reset links work once and expire after a while. Request a new link and use the most recent email.
        </Alert>
        <Button as={Link} to="/forgot-password" variant="primary" size="lg" icon={Mail} className="w-full mt-4">
          Request a New Link
        </Button>
      </Card>
    )
  }

  function validate() {
    const next = {}
    if (password.length < MIN_PASSWORD_LENGTH) {
      next.password = `Use at least ${MIN_PASSWORD_LENGTH} characters.`
    }
    if (confirm !== password) next.confirm = "The passwords don't match."
    return next
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    const errors = validate()
    setFieldErrors(errors)
    if (errors.password || errors.confirm) {
      document.getElementById(errors.password ? 'new-password' : 'confirm-password')?.focus()
      return
    }
    setSubmitting(true)
    try {
      await updatePassword(password)
      toast.success('Password updated. You are now logged in.')
      navigate('/', { replace: true })
    } catch (err) {
      setError(authErrorMessage(err, "We couldn't update your password. Please try again."))
      setSubmitting(false)
    }
  }

  return (
    <Card title="Set a New Password">
      <p className="text-sm text-gray-500 mb-4">
        Choose a new password for <strong className="font-semibold text-slate-800 break-all">{user.email}</strong>.
      </p>
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        {/* Hidden username field lets password managers attach the new password to the right account. */}
        <input type="email" name="username" autoComplete="username" value={user.email ?? ''} readOnly hidden />
        <TextField
          id="new-password"
          label="New Password"
          type="password"
          required
          autoComplete="new-password"
          hint={`At least ${MIN_PASSWORD_LENGTH} characters.`}
          error={fieldErrors.password}
          value={password}
          onChange={(v) => {
            setPassword(v)
            setFieldErrors((prev) => ({ ...prev, password: undefined }))
            setError(null)
          }}
        />
        <TextField
          id="confirm-password"
          label="Confirm New Password"
          type="password"
          required
          autoComplete="new-password"
          error={fieldErrors.confirm}
          value={confirm}
          onChange={(v) => {
            setConfirm(v)
            setFieldErrors((prev) => ({ ...prev, confirm: undefined }))
            setError(null)
          }}
        />
        {error && (
          <Alert tone="error" title="Password Not Updated">
            {error}
          </Alert>
        )}
        <Button type="submit" variant="primary" size="lg" icon={KeyRound} loading={submitting} className="w-full">
          {submitting ? 'Please Wait…' : 'Update Password'}
        </Button>
      </form>
    </Card>
  )
}
