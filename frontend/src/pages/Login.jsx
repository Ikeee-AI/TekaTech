import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { KeyRound, LogIn, UserPlus } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../hooks/useAuth'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { TextField } from '../components/ui/FormField'
import Alert from '../components/ui/Alert'
import Button from '../components/ui/Button'
import BackLink from '../components/ui/BackLink'
import { authErrorMessage, MIN_PASSWORD_LENGTH } from '../utils/authErrors'

const LINK_CLASS =
  'text-sm font-medium text-sage-700 hover:underline rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage-600'

export default function Login() {
  useDocumentTitle('Log In')
  const { signIn, signUp } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  // Return to the exact page that sent the user here, query string and hash
  // included (e.g. /compare?ids=…), not just its path.
  const fromLocation = location.state?.from
  const from = fromLocation?.pathname
    ? { pathname: fromLocation.pathname, search: fromLocation.search ?? '', hash: fromLocation.hash ?? '' }
    : '/'

  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  // 'confirm' after a successful sign up, 'exists' when the email is already registered.
  const [notice, setNotice] = useState(null)

  // Every mode change starts from a clean form: no values, errors or messages carry over.
  // keepEmail is only used by the "already has an account" actions, where the address
  // the user just typed is the one they want to log in or reset with.
  function switchMode(next, { keepEmail = false } = {}) {
    setMode(next)
    if (!keepEmail) setEmail('')
    setPassword('')
    setError(null)
    setNotice(null)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    setNotice(null)
    try {
      if (mode === 'login') {
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
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-sm mx-auto">
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h1 className="font-display text-xl font-bold text-gray-900 mb-1">
          {mode === 'login' ? 'Log In' : 'Create an Account'}
        </h1>
        <p className="text-sm text-gray-500 mb-4">
          {mode === 'login'
            ? 'Needed to suggest corrections to specs and follow their review.'
            : 'Browsing, comparing and AI questions never require an account — it is only for suggesting corrections.'}
        </p>
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
            }}
          />
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
          {error && (
            <Alert tone="error" title={mode === 'login' ? 'Log In Failed' : 'Sign Up Failed'}>
              {error}
            </Alert>
          )}
          <Button type="submit" variant="primary" size="lg" icon={mode === 'login' ? LogIn : UserPlus} loading={submitting} className="w-full">
            {submitting ? 'Please Wait…' : mode === 'login' ? 'Log In' : 'Sign Up'}
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
        </div>
        <button
          type="button"
          onClick={() => switchMode(mode === 'login' ? 'signup' : 'login')}
          disabled={submitting}
          className={`w-full text-center mt-4 min-h-10 disabled:opacity-50 disabled:cursor-not-allowed ${LINK_CLASS}`}
        >
          {mode === 'login' ? "Don't have an account? Sign Up" : 'Already have an account? Log In'}
        </button>
      </div>
      <div className="text-center mt-4">
        <BackLink to="/">Back to Catalog</BackLink>
      </div>
    </div>
  )
}
