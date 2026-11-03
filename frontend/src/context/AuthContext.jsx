import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { AuthContext } from './authContextValue'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
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

  async function signOut() {
    await supabase.auth.signOut()
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
  }

  return (
    <AuthContext.Provider
      value={{ user, loading, signUp, resendConfirmation, signIn, signOut, requestPasswordReset, updatePassword }}
    >
      {children}
    </AuthContext.Provider>
  )
}
