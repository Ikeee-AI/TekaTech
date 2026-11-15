import { useEffect, useState } from 'react'
import { emailLinkSession, legacyLinkSession, supabase } from '../supabaseClient'
import { clearAuthCodeFromUrl, isRecoveryActive, openResetForm, setRecoveryActive } from '../utils/authLink'
import { AuthContext } from './authContextValue'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  // A fresh password-recovery session from a reset link in this tab: the only thing that
  // opens the reset form (a leftover or ended sign-in must not; bug seen 14 Nov 2026).
  const [recoveryActive, setRecoveryState] = useState(isRecoveryActive)
  // Outcome of an any-browser email link (?token_hash=…): { type, ok, code } or null.
  const [emailLink, setEmailLink] = useState(null)

  function markRecovery() {
    setRecoveryActive(true)
    setRecoveryState(true)
    openResetForm()
  }

  useEffect(() => {
    // Before reading the session: an any-browser link's verifyOtp (emailLinkSession), a
    // pre-PKCE #access_token=… link (legacyLinkSession); getSession() itself waits for
    // supabase-js to exchange a PKCE ?code=… link sent before the switch.
    Promise.all([legacyLinkSession, emailLinkSession])
      .then(([legacyType, linkResult]) => {
        setEmailLink(linkResult)
        if (legacyType === 'recovery' || (linkResult?.ok && linkResult.type === 'recovery')) markRecovery()
        return supabase.auth.getSession()
      })
      .then(({ data: { session } }) => {
        setUser(session?.user ?? null)
        setLoading(false)
        clearAuthCodeFromUrl()
      })
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null)
      // A reset link always ends on the reset form, even if Supabase redirected elsewhere.
      if (event === 'PASSWORD_RECOVERY') markRecovery()
      if (event === 'SIGNED_OUT') {
        setRecoveryActive(false)
        setRecoveryState(false)
      }
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  // Returns Supabase's { user, session }. With email confirmation on, an address that is
  // already registered comes back as a user with an empty `identities` array and no email
  // is sent; Login.jsx checks for that. emailRedirectTo keeps the confirmation link on the
  // origin the user signed up from instead of the dashboard Site URL (the origin must be
  // in the project's Redirect URLs allow list, otherwise Supabase falls back to Site URL).
  async function signUp(email, password) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: window.location.origin },
    })
    if (error) throw error
    return data
  }

  // A new sign-up confirmation email (#196), for an expired link or one that never arrived.
  // Same redirect as signUp(). The page shows a neutral message whatever the address.
  async function resendConfirmation(email) {
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: { emailRedirectTo: window.location.origin },
    })
    if (error) throw error
  }

  // Returns the signed-in user, so Login.jsx can pick the landing page (admins: catalog,
  // everyone else: My Gadgets).
  async function signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    return data?.user ?? null
  }

  // `options` goes straight to supabase.auth.signOut. Callers normally pass nothing (global sign-out).
  // Delete My Account (#213) passes { scope: 'local' }: the account is already gone, and a local
  // sign-out removes this browser's session before any network call, so it can't fail half-way.
  async function signOut(options) {
    await supabase.auth.signOut(options)
  }

  // Supabase answers the same way whether or not the address has an account, so the
  // page can show one neutral confirmation without revealing who is registered.
  async function requestPasswordReset(email) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    if (error) throw error
  }

  // Needs a session: the recovery session supabase-js creates from the email link
  // (it parses the URL before getSession() resolves), or an ordinary signed-in one.
  async function updatePassword(password) {
    const { error } = await supabase.auth.updateUser({ password })
    if (error) throw error
    setRecoveryActive(false)
    setRecoveryState(false)
  }

  return (
    <AuthContext.Provider
      value={{ user, loading, recoveryActive, emailLink, signUp, resendConfirmation, signIn, signOut, requestPasswordReset, updatePassword }}
    >
      {children}
    </AuthContext.Provider>
  )
}
