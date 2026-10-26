import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { LogIn, UserPlus } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../hooks/useAuth'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { TextField } from '../components/ui/FormField'
import Alert from '../components/ui/Alert'
import Button from '../components/ui/Button'
import BackLink from '../components/ui/BackLink'

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

  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      if (mode === 'login') {
        await signIn(email, password)
        toast.success('Logged in')
        navigate(from, { replace: true })
      } else {
        await signUp(email, password)
        toast.success('Account created — check your email to confirm, then log in.')
        setMode('login')
      }
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.')
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
            ? 'Needed to add gadgets or submit corrections.'
            : 'Browsing and AI questions never require an account — this is only for contributing.'}
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
          <TextField
            id="password"
            label="Password"
            type="password"
            required
            minLength={6}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            hint={mode === 'signup' ? 'At least 6 characters.' : undefined}
            value={password}
            onChange={(v) => {
              setPassword(v)
              setError(null)
            }}
          />
          {error && (
            <Alert tone="error" title={mode === 'login' ? 'Log In Failed' : 'Sign Up Failed'}>
              {error}
            </Alert>
          )}
          <Button type="submit" variant="primary" size="lg" icon={mode === 'login' ? LogIn : UserPlus} loading={submitting} className="w-full">
            {submitting ? 'Please Wait…' : mode === 'login' ? 'Log In' : 'Sign Up'}
          </Button>
        </form>
        <button
          onClick={() => {
            setMode(mode === 'login' ? 'signup' : 'login')
            setError(null)
          }}
          className="w-full text-center text-sm font-medium text-sage-700 hover:underline mt-4 py-1 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage-400"
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