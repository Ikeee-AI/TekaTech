import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Inbox, KeyRound, LayoutGrid, ShieldCheck, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../hooks/useAuth'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { api } from '../api/client'
import { TextField } from '../components/ui/FormField'
import Alert from '../components/ui/Alert'
import Button from '../components/ui/Button'
import BackLink from '../components/ui/BackLink'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import { authErrorMessage } from '../utils/authErrors'
import { friendlyError } from '../utils/requestErrors'
import { PASSWORD_HINT } from '../utils/passwordStrength'
import PasswordStrength from '../components/PasswordStrength'
import { isWrongPassword, validatePasswordChange } from '../utils/passwordChange'

const EMPTY = { current: '', next: '', confirm: '' }
const FIELD_IDS = { current: 'current-password', next: 'new-password', confirm: 'confirm-password' }
const DELETE_PASSWORD_ID = 'delete-account-password'
// Shown on the backend's 409 (#213): the catalog is admin-curated, so an admin loses the flag first.
const ADMIN_DELETE_MESSAGE = "Admin accounts can't be deleted here. Ask the owner to remove the admin flag first."
const ACCOUNT_DELETED_NOTICE = 'Your account was deleted. Thanks for using TekaTech.'

function formatDate(value) {
  const date = value ? new Date(value) : null
  if (!date || Number.isNaN(date.getTime())) return null
  return date.toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })
}

/**
 * Delete my account (#213). Two steps so one stray click can't do it: the form asks for the
 * current password, then a confirm dialog does the work. On confirm the password is re-checked
 * by signing in again (as Change Password does), then DELETE /me/account removes the user's
 * rows and Supabase Auth user, and the user is signed out and sent to the catalog with a notice.
 * Admins see up front that they can't delete here (the button is disabled); the backend's 409
 * stays handled as a fallback, e.g. when the flag was added after this page loaded.
 */
function DeleteAccountSection({ user, isAdmin, className = '' }) {
  const { signIn, signOut } = useAuth()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [fieldError, setFieldError] = useState(null)
  const [error, setError] = useState(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [dialogError, setDialogError] = useState(null)
  const [deleting, setDeleting] = useState(false)
  // The real double-submit guard: state only changes on the next render, so two clicks in the
  // same tick would both see deleting === false; a ref is updated at once.
  const deletingRef = useRef(false)
  // Set when the dialog closes because of a wrong password: the field gets focus once the
  // dialog has handed focus back to its opener (its cleanup runs before this page's effect).
  const focusPasswordAfterClose = useRef(false)

  // After a successful delete: sign out once this page has left the screen (see handleConfirm).
  // The Auth user is gone, so only this browser's session needs clearing; the local scope removes
  // it before any network call (supabase.auth.signOut reports errors as a return value, not a
  // throw, so a global sign-out could fail silently and keep the session).
  const signOutOnLeave = useRef(false)
  const signOutRef = useRef(signOut)
  useEffect(() => {
    signOutRef.current = signOut
  }, [signOut])
  useEffect(() => {
    const pending = signOutOnLeave
    const latestSignOut = signOutRef
    return () => {
      if (pending.current) {
        Promise.resolve(latestSignOut.current({ scope: 'local' })).catch(() => {
          // ignore: the account no longer exists either way
        })
      }
    }
  }, [])

  useEffect(() => {
    if (!confirmOpen && focusPasswordAfterClose.current) {
      focusPasswordAfterClose.current = false
      document.getElementById(DELETE_PASSWORD_ID)?.focus()
    }
  }, [confirmOpen])

  function updatePassword(value) {
    setPassword(value)
    setFieldError(null)
    setError(null)
  }

  function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    if (isAdmin) return
    if (!password) {
      setFieldError('Enter your current password.')
      document.getElementById(DELETE_PASSWORD_ID)?.focus()
      return
    }
    setDialogError(null)
    setConfirmOpen(true)
  }

  function cancel() {
    if (deleting) return
    setConfirmOpen(false)
    setDialogError(null)
  }

  async function handleConfirm() {
    if (deletingRef.current) return
    deletingRef.current = true
    setDeleting(true)
    setDialogError(null)
    try {
      // Re-check the current password by signing in again with it (same account, fresh session).
      try {
        await signIn(user.email, password)
      } catch (err) {
        if (isWrongPassword(err)) {
          setFieldError('Your current password is incorrect.')
          focusPasswordAfterClose.current = true
          setConfirmOpen(false)
        } else {
          setDialogError(authErrorMessage(err, "We couldn't check your password. Please try again."))
        }
        return
      }
      try {
        await api.deleteMyAccount()
      } catch (err) {
        if (err?.status === 409) {
          setError(ADMIN_DELETE_MESSAGE)
          setConfirmOpen(false)
        } else {
          // Network failure, 401, 429 or the backend's 503 (nothing more was changed; retry is safe).
          setDialogError(friendlyError(err))
        }
        return
      }
      // Leave the protected /account route before signing out: React Router renders a navigation
      // as a transition, so a sign-out started now (user -> null) would render first and
      // ProtectedRoute would send the user to /login. The sign-out runs in the unmount cleanup
      // above, i.e. only once the catalog has replaced this page.
      signOutOnLeave.current = true
      toast.success(ACCOUNT_DELETED_NOTICE, { duration: 6000 })
      navigate('/', { replace: true })
    } finally {
      deletingRef.current = false
      setDeleting(false)
    }
  }

  return (
    <section
      aria-labelledby="delete-account-title"
      className={`flex flex-col bg-white border border-red-200 rounded-[28px] p-6 ${className}`}
    >
      <h2 id="delete-account-title" className="font-display text-lg font-bold text-red-700 mb-1">
        Delete My Account
      </h2>
      <p className="text-sm text-slate-600 mb-4">
        Removes your account, your My Gadgets list, your saved questions and your pending suggestions. This
        can&apos;t be undone.
      </p>
      {isAdmin && (
        <Alert tone="warning" id="delete-account-admin-note" className="mb-4">
          {ADMIN_DELETE_MESSAGE}
        </Alert>
      )}
      <form onSubmit={handleSubmit} noValidate className="flex flex-1 flex-col gap-4">
        <input type="email" name="username" autoComplete="username" value={user.email ?? ''} readOnly hidden />
        <TextField
          id={DELETE_PASSWORD_ID}
          label="Your Password"
          type="password"
          required
          autoComplete="current-password"
          hint="We check it again before anything is deleted."
          error={fieldError}
          value={password}
          onChange={updatePassword}
          disabled={isAdmin}
        />
        <div aria-live="polite">
          {error && (
            <Alert tone="error" title="Account Not Deleted">
              {error}
            </Alert>
          )}
        </div>
        <Button
          type="submit"
          variant="danger"
          size="lg"
          icon={Trash2}
          disabled={deleting || isAdmin}
          aria-describedby={isAdmin ? 'delete-account-admin-note' : undefined}
          className="w-full mt-auto"
        >
          Delete My Account
        </Button>
      </form>
      <ConfirmDialog
        open={confirmOpen}
        title="Delete your TekaTech account?"
        description={
          <>
            Your account, My Gadgets list, saved questions and pending suggestions are deleted for good. Suggestions
            an admin already approved stay in the catalog without your name.
          </>
        }
        confirmLabel="Yes, delete my account"
        busyLabel="Deleting…"
        busy={deleting}
        error={dialogError}
        onConfirm={handleConfirm}
        onCancel={cancel}
      />
    </section>
  )
}

/**
 * The signed-in user's account page (#204): email, links to their lists, Change Password and
 * Delete My Account (#213).
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
    <div className="flex flex-col gap-4">
      <BackLink to="/my-gadgets">Back to My Gadgets</BackLink>
      {/* Two columns on wide screens (rebrand: no tall narrow column with empty sides): Your Account with
          Delete My Account under it on the left, Change Password on the right. The columns stretch to the same
          height and the delete card fills the rest, so its bottom lines up with Change Password's. On phones the
          left column is display:contents and `order` keeps Account, Change Password, Delete. */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="contents lg:flex lg:flex-col lg:gap-4">

      <section aria-labelledby="account-title" className="order-1 lg:order-none bg-white border border-slate-200 rounded-[28px] p-6">
        <h1 id="account-title" className="text-3xl font-extrabold tracking-[-0.045em] text-slate-900">
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
                <ShieldCheck size={16} aria-hidden="true" className="text-sage-700" /> Admin (curates the catalog)
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

      <DeleteAccountSection user={user} isAdmin={isAdmin} className="order-3 lg:order-none lg:flex-1" />
      </div>

      <section aria-labelledby="password-title" className="order-2 lg:order-none bg-white border border-slate-200 rounded-[28px] p-6">
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
          <div>
            <TextField
              id={FIELD_IDS.next}
              label="New Password"
              type="password"
              required
              autoComplete="new-password"
              hint={PASSWORD_HINT}
              error={fieldErrors.next}
              value={values.next}
              onChange={update('next')}
            />
            <PasswordStrength password={values.next} id="new-password-strength" />
          </div>
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
    </div>
  )
}
