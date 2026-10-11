import { useState } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { LogIn, UserPlus } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../hooks/useAuth'
import { useDocumentTitle } from '../hooks/useDocumentTitle'

export default function Login() {
  useDocumentTitle('Log in')
  const { signIn, signUp } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = location.state?.from?.pathname || '/'

  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitting(true)
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
      toast.error(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-sm mx-auto">
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h1 className="font-display text-xl font-bold text-gray-900 mb-1">
          {mode === 'login' ? 'Log in' : 'Create an account'}
        </h1>
        <p className="text-sm text-gray-500 mb-4">
          {mode === 'login'
            ? 'Needed to add gadgets or submit corrections.'
            : 'Browsing and AI questions never require an account — this is only for contributing.'}
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email</label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:border-teal-400 focus:ring-1 focus:ring-teal-400 outline-none transition"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">Password</label>
            <input
              id="password"
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:border-teal-400 focus:ring-1 focus:ring-teal-400 outline-none transition"
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="w-full flex items-center justify-center gap-1.5 bg-teal-600 text-white font-medium py-2.5 rounded-md hover:bg-teal-700 active:scale-95 disabled:opacity-50 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 focus-visible:ring-offset-2"
          >
            {mode === 'login' ? <LogIn size={15} /> : <UserPlus size={15} />}
            {submitting ? 'Please wait...' : mode === 'login' ? 'Log in' : 'Sign up'}
          </button>
        </form>
        <button
          onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
          className="w-full text-center text-xs text-teal-600 hover:underline mt-4"
        >
          {mode === 'login' ? "Don't have an account? Sign up" : 'Already have an account? Log in'}
        </button>
      </div>
      <Link to="/" className="block text-center text-sm text-gray-500 hover:text-gray-700 mt-4">
        ← Back to catalog
      </Link>
    </div>
  )
}