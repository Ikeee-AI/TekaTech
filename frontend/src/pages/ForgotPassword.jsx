import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Mail } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { TextField } from '../components/ui/FormField'
import Alert from '../components/ui/Alert'
import Button from '../components/ui/Button'
import BackLink from '../components/ui/BackLink'
import { authErrorMessage } from '../utils/authErrors'

export default function ForgotPassword() {
  useDocumentTitle('Forgot Password')
  const { requestPasswordReset } = useAuth()
  const location = useLocation()

  // Prefilled when the user arrives from the login form or the "already has an account" message.
  const [email, setEmail] = useState(location.state?.email ?? '')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [sent, setSent] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    setSent(false)
    try {
      await requestPasswordReset(email.trim())
      setSent(true)
    } catch (err) {
      setError(authErrorMessage(err, "We couldn't send the reset email. Please try again."))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-sm mx-auto">
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h1 className="font-display text-xl font-bold text-gray-900 mb-1">Forgot Password</h1>
        <p className="text-sm text-gray-500 mb-4">
          Enter the email you signed up with and we&apos;ll send you a link to set a new password.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <TextField
            id="email"
            label="Email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(v) => {
              setEmail(v)
              setError(null)
            }}
          />
          {error && (
            <Alert tone="error" title="Reset Email Not Sent">
              {error}
            </Alert>
          )}
          <div aria-live="polite">
            {sent && (
              <Alert tone="success" title="Check Your Email">
                If an account exists for this email, we&apos;ve sent a reset link. It can take a few minutes, so
                check your spam folder too.
              </Alert>
            )}
          </div>
          <Button type="submit" variant="primary" size="lg" icon={Mail} loading={submitting} className="w-full">
            {submitting ? 'Please Wait…' : sent ? 'Send Again' : 'Send Reset Link'}
          </Button>
        </form>
      </div>
      <div className="text-center mt-4">
        <BackLink to="/login">Back to Log In</BackLink>
      </div>
    </div>
  )
}
