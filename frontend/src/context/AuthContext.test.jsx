// AuthProvider and email links after the PKCE switch: it waits for a pre-PKCE link's
// session, cleans a ?code=… out of the URL, and sends a recovery session to the reset form.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { useAuth } from '../hooks/useAuth'

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  onAuthStateChange: vi.fn(),
  legacy: { type: null },
  clearAuthCodeFromUrl: vi.fn(),
  openResetForm: vi.fn(),
}))

vi.mock('../supabaseClient', () => ({
  supabase: { auth: { getSession: mocks.getSession, onAuthStateChange: mocks.onAuthStateChange } },
  get legacyLinkSession() {
    return Promise.resolve(mocks.legacy.type)
  },
}))
vi.mock('../utils/authLink', () => ({
  clearAuthCodeFromUrl: mocks.clearAuthCodeFromUrl,
  openResetForm: mocks.openResetForm,
}))

const { AuthProvider } = await import('./AuthContext')

const USER = { id: 'u-1', email: 'reset.me@example.com' }
let emit

function Who() {
  const { user, loading } = useAuth()
  return <p>{loading ? 'loading' : (user?.email ?? 'signed out')}</p>
}

beforeEach(() => {
  mocks.legacy.type = null
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
    expect(await screen.findByText('reset.me@example.com')).toBeTruthy()
  })
})
