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
import { authErrorMessage, isEmailNotConfirmed } from '../utils/authErrors'
import { PASSWORD_HINT, passwordError } from '../utils/passwordStrength'
import PasswordStrength from '../components/PasswordStrength'
import { saveReturnPath } from '../utils/returnPath'

// ?mode=signup or ?mode=resend opens the page in that mode (#196); anything else is Log In.
const LINK_MODES = ['signup', 'resend']

const TITLES = { login: 'Log In', signup: 'Create an Account', resend: 'Resend Confirmation Email' }
const INTROS = {
  login: 'Log in to view specs, compare phones, ask the AI and save phones to My Gadgets.',
  signup: 'A free account lets you view full specs, compare phones, ask the AI (20 questions a day) and save phones.',
  resend: "Enter the email you signed up with and we'll send a new confirmation link.",
}
const FAILURE_TITLES = { login: 'Log In Failed', signup: 'Sign Up Failed', resend: 'Could Not Send the Email' }

const AUTH_PAGES = ['/login', '/forgot-password', '/reset-password']

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
  // Never the log-in or password pages themselves, which would leave the user on them.
  const fromLocation = location.state?.from
  const from = fromLocation?.pathname && !AUTH_PAGES.includes(fromLocation.pathname)
    ? { pathname: fromLocation.pathname, search: fromLocation.search ?? '', hash: fromLocation.hash ?? '' }
    : null
  // With no page to return to, admins land on the catalog they curate and everyone
  // else on their own My Gadgets dashboard.
  const landing = (signedInUser) => from ?? (signedInUser?.app_metadata?.is_admin ? '/' : '/my-gadgets')

  const [mode, setMode] = useState(() => {
    const requested = searchParams.get('mode')
    return LINK_MODES.includes(requested) ? requested : 'login'
  })
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  // Sign-up only: the new password misses a rule (utils/passwordStrength.js).
  const [passwordFieldError, setPasswordFieldError] = useState(null)
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
    setPasswordFieldError(null)
    setError(null)
    setNotice(null)
    setUnconfirmed(false)
  }

  // Neutral on purpose: the same message whether or not the address has an account.
  async function sendConfirmation() {
    await resendConfirmation(email)
    // The new link should bring the user back to the page they came from too (#196).
    if (from) saveReturnPath(from)
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
    // New accounts must meet every password rule before Supabase is called. Log In does not
    // check them: accounts made before 14 Nov 2026 may still have a shorter password.
    if (mode === 'signup') {
      const weak = passwordError(password)
      setPasswordFieldError(weak)
      if (weak) {
        document.getElementById('password')?.focus()
        return
      }
    }
    setSubmitting(true)
    setError(null)
    setNotice(null)
    setUnconfirmed(false)
    try {
      if (mode === 'resend') {
        await sendConfirmation()
      } else if (mode === 'login') {
        const signedInUser = await signIn(email, password)
        toast.success('Logged in')
        navigate(landing(signedInUser), { replace: true })
      } else {
        const data = await signUp(email, password)
        if (data?.user && data.user.identities?.length === 0) {
          // Supabase hides existing accounts behind a fake success; say so plainly.
          setPassword('')
          setNotice('exists')
        } else if (data?.session) {
          // Only happens if email confirmation is turned off in Supabase.
          toast.success('Account created')
          navigate(landing(data.user), { replace: true })
        } else {
          // Confirmation email sent: remember where the user came from, so the link
          // brings them back there (AuthLinkNotice) instead of the catalog (#196).
          if (from) saveReturnPath(from)
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
    <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">
      <LoginPerks />
      <div className="flex flex-col">
      <div className="bg-white border border-slate-200 rounded-[28px] p-6 sm:p-8 flex-1">
        <h1 className="text-3xl font-extrabold tracking-[-0.045em] text-slate-900 mb-1">
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
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                hint={mode === 'signup' ? PASSWORD_HINT : undefined}
                error={mode === 'signup' ? passwordFieldError : undefined}
                value={password}
                onChange={(v) => {
                  setPassword(v)
                  setPasswordFieldError(null)
                  setError(null)
                }}
              />
              {mode === 'signup' && <PasswordStrength password={password} id="password-strength" />}
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
              Check your email for a confirmation link, then log in here. It can take a few minutes, so check your
              spam folder too.
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
              link in the most recent email, and check your spam folder too.
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
    </div>
  )
}

const PERKS = [
  ['My Gadgets', 'Save the phones you’re considering', 'bg-sage-700 text-white'],
  ['Saved questions', 'Answers kept for each phone', 'bg-inverse text-inverse-ink'],
  ['Suggestions', 'Flag a spec that looks wrong', 'bg-pop text-pop-ink'],
  ['Free', 'No payment, ever. 20 AI questions a day', 'bg-slate-100 text-slate-900'],
]

// Why sign in (rebrand canvas, 13 Nov 2026). Decorative summary; hidden on phones to keep the form first.
function LoginPerks() {
  return (
    <section aria-label="Why sign in" className="hidden lg:flex flex-col justify-between gap-6 p-8 rounded-[28px] bg-white border border-slate-200">
      <div>
        <p className="text-5xl font-extrabold tracking-[-0.055em] leading-[0.98] text-slate-900">Specs you can check.</p>
        <p className="mt-3 text-base text-slate-600 max-w-sm">
          Log in to save phones, keep your questions and suggest corrections.
        </p>
      </div>
      <ul className="grid grid-cols-2 gap-2.5">
        {PERKS.map(([title, text, tone]) => (
          <li key={title} className={`p-4 rounded-[20px] ${tone}`}>
            <p className="text-[15px] font-extrabold">{title}</p>
            <p className="mt-1 text-[13px] opacity-85">{text}</p>
          </li>
        ))}
      </ul>
    </section>
  )
}
