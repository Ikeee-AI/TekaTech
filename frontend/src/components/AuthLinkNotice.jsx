import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { LogIn, Mail, X } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { initialAuthLink, initialPathname } from '../utils/authLink'
import { takeReturnPath } from '../utils/returnPath'
import Alert from './ui/Alert'
import Button from './ui/Button'

/** Removes an email link's error params from the address bar, so a refresh doesn't show the notice again. */
function clearLinkErrorFromUrl() {
  const url = new URL(window.location.href)
  for (const key of ['error', 'error_code', 'error_description']) url.searchParams.delete(key)
  if (/(^#|&)error(_code)?=/.test(url.hash)) url.hash = ''
  window.history.replaceState(window.history.state, '', url)
}

/**
 * One-time feedback for the sign-up confirmation email (#196), shown above the page the
 * link opened (the catalog):
 * - a working link: "Email Confirmed", once supabase-js has signed the user in;
 * - an expired or used link: a plain message, plus a way to get a new link.
 * A bad password-reset link is left to ResetPassword, which has its own message.
 * After a working link, the user is taken back to the page they signed up from, if this
 * browser remembers one (utils/returnPath.js); the notice stays on top of that page.
 * `link` and `pathname` default to what the URL held when the app loaded (utils/authLink.js).
 */
export default function AuthLinkNotice({ link = initialAuthLink, pathname = initialPathname }) {
  const { user, loading } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [notice, setNotice] = useState(() => (pathname === '/reset-password' ? null : link))
  const returned = useRef(false)

  useEffect(() => {
    if (notice?.kind === 'error') clearLinkErrorFromUrl()
  }, [notice])

  useEffect(() => {
    if (returned.current || notice?.kind !== 'confirmed' || loading || !user) return
    returned.current = true
    const path = takeReturnPath()
    if (path) navigate(path, { replace: true })
  }, [notice, loading, user, navigate])

  if (!notice) return null
  // Wait for the session supabase-js creates from the link before saying who is signed in.
  if (notice.kind === 'confirmed' && (loading || !user)) return null

  const dismiss = () => setNotice(null)
  const dismissButton = (
    <Button size="sm" variant="ghost" icon={X} onClick={dismiss}>
      Dismiss
    </Button>
  )

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-4">
      {notice.kind === 'confirmed' ? (
        <Alert tone="success" title="Email Confirmed" action={dismissButton}>
          You&apos;re signed in as <strong className="font-semibold break-all">{user.email}</strong>. You can now suggest
          corrections to specs and follow their review.
        </Alert>
      ) : user ? (
        <Alert tone="warning" title="This Email Link Has Expired or Was Already Used" action={dismissButton}>
          You&apos;re already signed in, so there&apos;s nothing else to do.
        </Alert>
      ) : (
        <Alert
          tone="error"
          title="This Email Link Has Expired or Was Already Used"
          action={
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="primary" icon={Mail} as={Link} to="/login?mode=resend" state={{ from: location }} onClick={dismiss}>
                Send a New Link
              </Button>
              <Button size="sm" variant="secondary" icon={LogIn} as={Link} to="/login" state={{ from: location }} onClick={dismiss}>
                Log In
              </Button>
              {dismissButton}
            </div>
          }
        >
          Email links work once and expire after a while. If you already confirmed your email, just log in. Otherwise,
          send yourself a new confirmation link.
        </Alert>
      )}
    </div>
  )
}
