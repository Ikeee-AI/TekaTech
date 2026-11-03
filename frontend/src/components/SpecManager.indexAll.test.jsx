// "Index All Pending" (admins only): indexes pending chunks one at a time through the same
// endpoint as the per-card button, and stops at the hourly rate limit instead of retrying.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AuthContext } from '../context/authContextValue'
import SpecManager from './SpecManager'

const api = vi.hoisted(() => ({ getSpecs: vi.fn(), indexSpec: vi.fn() }))
vi.mock('../api/client', () => ({ api }))
const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }))
vi.mock('react-hot-toast', () => ({ default: toast }))

const spec = (n, status = 'pending') => ({
  id: `s${n}`,
  gadget_id: 'g1',
  content: `Spec text ${n}`,
  source_url: null,
  chunk_index: n,
  verified_at: '2026-11-01T00:00:00+00:00',
  indexing_status: status,
})

const ADMIN = { id: 'a', app_metadata: { is_admin: true } }
const USER = { id: 'u', app_metadata: {} }

function renderAs(user) {
  return render(
    <MemoryRouter>
      <AuthContext.Provider value={{ user }}>
        <SpecManager gadgetId="g1" />
      </AuthContext.Provider>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  api.getSpecs.mockReset()
  api.indexSpec.mockReset()
  toast.success.mockReset()
  toast.error.mockReset()
})
afterEach(cleanup)

describe('Index All Pending', () => {
  it('is not shown to a regular user', async () => {
    api.getSpecs.mockResolvedValue([spec(1), spec(2)])
    renderAs(USER)
    await screen.findByText('Spec text 1')
    expect(screen.queryByRole('button', { name: /index all pending/i })).toBeNull()
  })

  it('is not shown when every spec is already indexed', async () => {
    api.getSpecs.mockResolvedValue([spec(1, 'indexed')])
    renderAs(ADMIN)
    await screen.findByText('Spec text 1')
    expect(screen.queryByRole('button', { name: /index all pending/i })).toBeNull()
  })

  it('indexes only the pending specs, one at a time, and reports success', async () => {
    api.getSpecs.mockResolvedValue([spec(1), spec(2, 'indexed'), spec(3)])
    api.indexSpec.mockResolvedValue({ indexing_status: 'indexed' })
    renderAs(ADMIN)
    fireEvent.click(await screen.findByRole('button', { name: /index all pending \(2\)/i }))
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('All 2 specs ready for AI questions'))
    expect(api.indexSpec.mock.calls).toEqual([
      ['g1', 's1'],
      ['g1', 's3'],
    ])
  })

  it('stops at the hourly rate limit and says how many are left', async () => {
    api.getSpecs.mockResolvedValue([spec(1), spec(2), spec(3)])
    api.indexSpec
      .mockResolvedValueOnce({ indexing_status: 'indexed' })
      .mockRejectedValueOnce(Object.assign(new Error('Rate limit exceeded'), { status: 429 }))
    renderAs(ADMIN)
    fireEvent.click(await screen.findByRole('button', { name: /index all pending \(3\)/i }))
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith('Indexed 1. Stopped at the hourly indexing limit; 2 still pending.'),
    )
    expect(api.indexSpec).toHaveBeenCalledTimes(2)
  })

  it('keeps going past an ordinary failure and reports it', async () => {
    api.getSpecs.mockResolvedValue([spec(1), spec(2)])
    api.indexSpec
      .mockRejectedValueOnce(Object.assign(new Error('AI indexing is unavailable.'), { status: 503 }))
      .mockResolvedValueOnce({ indexing_status: 'indexed' })
    renderAs(ADMIN)
    fireEvent.click(await screen.findByRole('button', { name: /index all pending \(2\)/i }))
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Indexed 1 of 2. 1 failed; see the cards below.'))
    expect(api.indexSpec).toHaveBeenCalledTimes(2)
  })
})
