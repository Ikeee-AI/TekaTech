// AuthProvider and email links after the PKCE switch: it waits for a pre-PKCE link's
// session, cleans a ?code=… out of the URL, and sends a recovery session to the reset form.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { useAuth } from '../hooks/useAuth'

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  onAuthStateChange: vi.fn(),
  legacy: { type: null },
  link: { result: null },
  clearAuthCodeFromUrl: vi.fn(),
  openResetForm: vi.fn(),
  setRecoveryActive: vi.fn(),
}))

vi.mock('../supabaseClient', () => ({
  supabase: { auth: { getSession: mocks.getSession, onAuthStateChange: mocks.onAuthStateChange } },
  get legacyLinkSession() {
    return Promise.resolve(mocks.legacy.type)
  },
  get emailLinkSession() {
    return Promise.resolve(mocks.link.result)
  },
}))
vi.mock('../utils/authLink', () => ({
  clearAuthCodeFromUrl: mocks.clearAuthCodeFromUrl,
  openResetForm: mocks.openResetForm,
  setRecoveryActive: mocks.setRecoveryActive,
  isRecoveryActive: () => false,
}))

const { AuthProvider } = await import('./AuthContext')

const USER = { id: 'u-1', email: 'reset.me@example.com' }
let emit

function Who() {
  const { user, loading, recoveryActive } = useAuth()
  return (
    <p>
      {loading ? 'loading' : (user?.email ?? 'signed out')}
      {recoveryActive ? ' (recovery)' : ''}
    </p>
  )
}

beforeEach(() => {
  mocks.legacy.type = null
  mocks.link.result = null
  mocks.getSession.mockResolvedValue({ data: { session: { user: USER } } })
  mocks.onAuthStateChange.mockImplementation((cb) => {
    emit = cb
    return { data: { subscription: { unsubscribe: vi.fn() } } }
  })
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('AuthProvider email links', () => {
  it('reads the session, then removes a leftover ?code=… from the URL', async () => {
    render(
      <AuthProvider>
        <Who />
      </AuthProvider>,
    )
    expect(await screen.findByText('reset.me@example.com')).toBeTruthy()
    expect(mocks.setRecoveryActive).not.toHaveBeenCalled()
    expect(mocks.clearAuthCodeFromUrl).toHaveBeenCalledTimes(1)
    expect(mocks.openResetForm).not.toHaveBeenCalled()
  })

  it('opens the reset form on PASSWORD_RECOVERY (a PKCE reset link)', async () => {
    render(
      <AuthProvider>
        <Who />
      </AuthProvider>,
    )
    await screen.findByText('reset.me@example.com')
    emit('SIGNED_IN', { user: USER })
    expect(mocks.openResetForm).not.toHaveBeenCalled()
    emit('PASSWORD_RECOVERY', { user: USER })
    expect(mocks.openResetForm).toHaveBeenCalledTimes(1)
  })

  it('opens the reset form for a pre-PKCE recovery link once its session is stored', async () => {
    mocks.legacy.type = 'recovery'
    render(
      <AuthProvider>
        <Who />
      </AuthProvider>,
    )
    await waitFor(() => expect(mocks.openResetForm).toHaveBeenCalledTimes(1))
    expect(await screen.findByText('reset.me@example.com (recovery)')).toBeTruthy()
  })

  it('marks a recovery session from an any-browser reset link (token_hash) and opens the form', async () => {
    mocks.link.result = { type: 'recovery', ok: true }
    render(
      <AuthProvider>
        <Who />
      </AuthProvider>,
    )
    expect(await screen.findByText('reset.me@example.com (recovery)')).toBeTruthy()
    expect(mocks.setRecoveryActive).toHaveBeenCalledWith(true)
    expect(mocks.openResetForm).toHaveBeenCalledTimes(1)
  })

  it('does not mark recovery for a failed reset link or a sign-up link', async () => {
    mocks.link.result = { type: 'recovery', ok: false, code: 'otp_expired' }
    render(
      <AuthProvider>
        <Who />
      </AuthProvider>,
    )
    expect(await screen.findByText('reset.me@example.com')).toBeTruthy()
    expect(mocks.openResetForm).not.toHaveBeenCalled()
    cleanup()
    mocks.link.result = { type: 'email', ok: true }
    render(
      <AuthProvider>
        <Who />
      </AuthProvider>,
    )
    expect(await screen.findByText('reset.me@example.com')).toBeTruthy()
    expect(mocks.openResetForm).not.toHaveBeenCalled()
  })

  it('a leftover sign-in is not a recovery session', async () => {
    render(
      <AuthProvider>
        <Who />
      </AuthProvider>,
    )
    expect(await screen.findByText('reset.me@example.com')).toBeTruthy()
    expect(screen.queryByText(/recovery/)).toBeNull()
  })
})
