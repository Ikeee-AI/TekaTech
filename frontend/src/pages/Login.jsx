import { useState } from 'react'
import { Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom'
import { KeyRound, LogIn, Mail, UserPlus } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../hooks/useAuth'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { TextField } from '../components/ui/FormField'
import Alert from '../components/ui/Alert'
import Button from '../components/ui/Button'
import BackLink from '../components/ui/BackLink'
import { authErrorMessage, isEmailNotConfirmed, MIN_PASSWORD_LENGTH } from '../utils/authErrors'

// ?mode=signup or ?mode=resend opens the page in that mode (#196); anything else is Log In.
const LINK_MODES = ['signup', 'resend']

const TITLES = { login: 'Log In', signup: 'Create an Account', resend: 'Resend Confirmation Email' }
const INTROS = {
  login: 'Needed to suggest corrections to specs and follow their review.',
  signup: 'Browsing, comparing and AI questions never require an account — it is only for suggesting corrections.',
  resend: "Enter the email you signed up with and we'll send a new confirmation link.",
}
const FAILURE_TITLES = { login: 'Log In Failed', signup: 'Sign Up Failed', resend: 'Could Not Send the Email' }

const LINK_CLASS =
  'text-sm font-medium text-sage-700 hover:underline rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage-600'

export default function Login() {
  useDocumentTitle('Log In')
  const { signIn, signUp, resendConfirmation } = useAuth()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const location = useLocation()
  // Return to the exact page that sent the user here, query string and hash
  // included (e.g. /compare?ids=…), not just its path.
  const fromLocation = location.state?.from
  const from = fromLocation?.pathname
    ? { pathname: fromLocation.pathname, search: fromLocation.search ?? '', hash: fromLocation.hash ?? '' }
    : '/'

  const [mode, setMode] = useState(() => {
    const requested = searchParams.get('mode')
    return LINK_MODES.includes(requested) ? requested : 'login'
  })
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  // 'confirm' after a successful sign up, 'exists' when the email is already registered,
  // 'resent' after a new confirmation email was requested.
  const [notice, setNotice] = useState(null)
  // Log in failed because the email isn't confirmed yet: offer to resend the email.
  const [unconfirmed, setUnconfirmed] = useState(false)
  const [resending, setResending] = useState(false)

  // Every mode change starts from a clean form: no values, errors or messages carry over.
  // keepEmail is only used by the "already has an account" actions, where the address
  // the user just typed is the one they want to log in or reset with.
  function switchMode(next, { keepEmail = false } = {}) {
    setMode(next)
    if (!keepEmail) setEmail('')
    setPassword('')
    setError(null)
    setNotice(null)
    setUnconfirmed(false)
  }

  // Neutral on purpose: the same message whether or not the address has an account.
  async function sendConfirmation() {
    await resendConfirmation(email)
    setError(null)
    setUnconfirmed(false)
    setNotice('resent')
  }

  async function handleResendFromError() {
    setResending(true)
    try {
      await sendConfirmation()
    } catch (err) {
      setError(authErrorMessage(err))
    } finally {
      setResending(false)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    setNotice(null)
    setUnconfirmed(false)
    try {
      if (mode === 'resend') {
        await sendConfirmation()
      } else if (mode === 'login') {
        await signIn(email, password)
        toast.success('Logged in')
        navigate(from, { replace: true })
      } else {
        const data = await signUp(email, password)
        if (data?.user && data.user.identities?.length === 0) {
          // Supabase hides existing accounts behind a fake success; say so plainly.
          setPassword('')
          setNotice('exists')
        } else if (data?.session) {
          // Only happens if email confirmation is turned off in Supabase.
          toast.success('Account created')
          navigate(from, { replace: true })
        } else {
          switchMode('login')
          setNotice('confirm')
        }
      }
    } catch (err) {
      setError(authErrorMessage(err))
      setUnconfirmed(mode === 'login' && isEmailNotConfirmed(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-sm mx-auto">
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h1 className="font-display text-xl font-bold text-gray-900 mb-1">
          {TITLES[mode]}
        </h1>
        <p className="text-sm text-gray-500 mb-4">{INTROS[mode]}</p>
        {/* key={mode} remounts the inputs so browser autofill state from the other mode can't leak in. */}
        <form key={mode} onSubmit={handleSubmit} className="space-y-4">
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
              setUnconfirmed(false)
            }}
          />
          {mode !== 'resend' && (
            <div>
              <TextField
                id="password"
                label="Password"
                type="password"
                required
                minLength={MIN_PASSWORD_LENGTH}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                hint={mode === 'signup' ? `At least ${MIN_PASSWORD_LENGTH} characters.` : undefined}
                value={password}
                onChange={(v) => {
                  setPassword(v)
                  setError(null)
                }}
              />
              {mode === 'login' && (
                <p className="text-right mt-1.5">
                  <Link to="/forgot-password" state={{ email }} className={`${LINK_CLASS} inline-flex items-center min-h-10`}>
                    Forgot password?
                  </Link>
                </p>
              )}
            </div>
          )}
          {error && (
            <Alert
              tone="error"
              title={FAILURE_TITLES[mode]}
              action={
                unconfirmed && (
                  <Button size="sm" variant="secondary" icon={Mail} loading={resending} onClick={handleResendFromError}>
                    Resend Confirmation Email
                  </Button>
                )
              }
            >
              {error}
            </Alert>
          )}
          <Button
            type="submit"
            variant="primary"
            size="lg"
            icon={{ login: LogIn, signup: UserPlus, resend: Mail }[mode]}
            loading={submitting}
            disabled={resending}
            className="w-full"
          >
            {submitting ? 'Please Wait…' : { login: 'Log In', signup: 'Sign Up', resend: 'Send Confirmation Email' }[mode]}
          </Button>
        </form>
        {/* Outside the keyed form so this live region survives a mode switch and announces the message. */}
        <div aria-live="polite" className={notice ? 'mt-4' : ''}>
          {notice === 'confirm' && (
            <Alert tone="success" title="Account Created">
              Check your email for a confirmation link, then log in here.
            </Alert>
          )}
          {notice === 'exists' && (
            <Alert
              tone="warning"
              title="Account Already Exists"
              action={
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="secondary" icon={LogIn} onClick={() => switchMode('login', { keepEmail: true })}>
                    Log In Instead
                  </Button>
                  <Button size="sm" variant="secondary" icon={KeyRound} as={Link} to="/forgot-password" state={{ email }}>
                    Reset Password
                  </Button>
                </div>
              }
            >
              This email already has an account. Log in or reset your password.
            </Alert>
          )}
          {notice === 'resent' && (
            <Alert tone="success" title="Check Your Email">
              If this email has an account that isn&apos;t confirmed yet, a new confirmation link is on its way. Use the
              link in the most recent email.
            </Alert>
          )}
        </div>
        <button
          type="button"
          onClick={() => (mode === 'resend' ? switchMode('login', { keepEmail: true }) : switchMode(mode === 'login' ? 'signup' : 'login'))}
          disabled={submitting || resending}
          className={`w-full text-center mt-4 min-h-10 disabled:opacity-50 disabled:cursor-not-allowed ${LINK_CLASS}`}
        >
          {mode === 'login' ? "Don't have an account? Sign Up" : mode === 'signup' ? 'Already have an account? Log In' : 'Back to Log In'}
        </button>
      </div>
      <div className="text-center mt-4">
        <BackLink to="/">Back to Catalog</BackLink>
      </div>
    </div>
  )
}
