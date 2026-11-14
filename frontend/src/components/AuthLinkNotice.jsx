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
 * - a working link: "Email Confirmed", once supabase-js has signed the user in; if it
 *   couldn't (PKCE: the link was opened in a different browser than the sign-up, so there
 *   is no code verifier), the address is still confirmed, so say so and offer Log In;
 * - an expired or used link: a plain message, plus a way to get a new link.
 * A bad password-reset link is left to ResetPassword, which has its own message.
 * After a working link, the user is taken back to the page they signed up from, if this
 * browser remembers one (utils/returnPath.js); the notice stays on top of that page.
 * `link` and `pathname` default to what the URL held when the app loaded (utils/authLink.js).
 */
export default function AuthLinkNotice({ link = initialAuthLink, pathname = initialPathname }) {
  const { user, loading, emailLink } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [dismissed, setDismissed] = useState(false)
  const [initial] = useState(() => (pathname === '/reset-password' || link?.type === 'recovery' ? null : link))
  const returned = useRef(false)
  // An any-browser link (?token_hash=…) is only "confirmed" once Supabase has accepted it.
  const notice =
    dismissed || !initial
      ? null
      : initial.kind !== 'otp'
        ? initial
        : loading || !emailLink
          ? { kind: 'pending' }
          : emailLink.ok
            ? { kind: 'confirmed' }
            : { kind: 'error', code: emailLink.code }

  const noticeKind = notice?.kind
  useEffect(() => {
    if (noticeKind === 'error') clearLinkErrorFromUrl()
  }, [noticeKind])

  // Back to the page the user signed up from (#196 item 4), once the link has signed them in
  // here. Not for a link opened in another browser: that one confirms but signs nobody in.
  useEffect(() => {
    if (returned.current || noticeKind !== 'confirmed' || loading || !user) return
    returned.current = true
    const path = takeReturnPath()
    if (path) navigate(path, { replace: true })
  }, [noticeKind, loading, user, navigate])

  if (!notice || notice.kind === 'pending') return null
  // Wait for the session supabase-js creates from the link before saying who is signed in.
  if (notice.kind === 'confirmed' && loading) return null

  const dismiss = () => setDismissed(true)
  const dismissButton = (
    <Button size="sm" variant="ghost" icon={X} onClick={dismiss}>
      Dismiss
    </Button>
  )

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-4">
      {notice.kind === 'confirmed' && user ? (
        <Alert tone="success" title="Email Confirmed" action={dismissButton}>
          You&apos;re signed in as <strong className="font-semibold break-all">{user.email}</strong>. You can now suggest
          corrections to specs and follow their review.
        </Alert>
      ) : notice.kind === 'confirmed' ? (
        <Alert
          tone="success"
          title="Email Confirmed"
          action={
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="primary" icon={LogIn} as={Link} to="/login" state={{ from: location }} onClick={dismiss}>
                Log In
              </Button>
              {dismissButton}
            </div>
          }
        >
          Your email address is confirmed. Log in to continue. (The link signs you in automatically only in the browser
          you signed up from.)
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
