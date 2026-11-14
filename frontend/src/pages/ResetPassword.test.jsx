// The reset form appears only for a fresh recovery session from a reset link. A leftover or
// ended sign-in in the same browser showed the form, then failed with "Session not found"
// (production, 14 Nov 2026).
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

const auth = vi.hoisted(() => ({ value: {} }))
vi.mock('../hooks/useAuth', () => ({ useAuth: () => auth.value }))

const { default: ResetPassword } = await import('./ResetPassword')
const USER = { id: 'u-1', email: 'reset.me@example.com' }

function show(value) {
  auth.value = { loading: false, emailLink: null, updatePassword: vi.fn(), ...value }
  render(
    <MemoryRouter>
      <ResetPassword />
    </MemoryRouter>,
  )
}

afterEach(cleanup)

describe('ResetPassword', () => {
  it('shows the form for a fresh recovery session', () => {
    show({ user: USER, recoveryActive: true })
    expect(screen.getByLabelText(/^New Password/)).toBeTruthy()
  })

  it('does not show the form for an ordinary sign-in', () => {
    show({ user: USER, recoveryActive: false })
    expect(screen.queryByLabelText(/^New Password/)).toBeNull()
    expect(screen.getByText('Reset Link Not Valid')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Account' })).toBeTruthy()
  })

  it('does not show the form when the reset link failed', () => {
    show({ user: USER, recoveryActive: true, emailLink: { type: 'recovery', ok: false, code: 'otp_expired' } })
    expect(screen.queryByLabelText(/^New Password/)).toBeNull()
  })

  it('shows the invalid-link message when nobody is signed in', () => {
    show({ user: null, recoveryActive: false })
    expect(screen.getByRole('link', { name: /Request a New Link/ })).toBeTruthy()
  })

  it('blocks a weak new password and shows the strength meter', () => {
    show({ user: USER, recoveryActive: true })
    fireEvent.change(screen.getByLabelText(/^New Password/), { target: { value: 'weakpass' } })
    fireEvent.change(screen.getByLabelText(/^Confirm New Password/), { target: { value: 'weakpass' } })
    expect(screen.getByText('Weak')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /Update Password/ }))
    expect(screen.getByText(/^Make it stronger/)).toBeTruthy()
    expect(auth.value.updatePassword).not.toHaveBeenCalled()
  })

  it('updates a password that meets every rule', () => {
    show({ user: USER, recoveryActive: true, updatePassword: vi.fn().mockResolvedValue(undefined) })
    fireEvent.change(screen.getByLabelText(/^New Password/), { target: { value: 'Strong-pass-12' } })
    fireEvent.change(screen.getByLabelText(/^Confirm New Password/), { target: { value: 'Strong-pass-12' } })
    expect(screen.getByText('Strong')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /Update Password/ }))
    expect(auth.value.updatePassword).toHaveBeenCalledWith('Strong-pass-12')
  })
})
