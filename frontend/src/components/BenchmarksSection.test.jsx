import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { api } from '../api/client'
import BenchmarksSection from './BenchmarksSection'

vi.mock('../api/client', () => ({ api: { getBenchmarks: vi.fn(), addBenchmark: vi.fn(), deleteBenchmark: vi.fn() } }))
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }))

const ROW = {
  id: 'b1', gadget_id: 'g1', kind: 'game', test: 'Genshin Impact', settings: 'High', value: 52, unit: 'fps',
  source_url: 'https://www.example.com/review', checked_at: '2026-11-20',
}

beforeEach(() => {
  api.getBenchmarks.mockReset()
  api.addBenchmark.mockReset()
  api.deleteBenchmark.mockReset()
})
afterEach(cleanup)

describe('BenchmarksSection', () => {
  it('shows each result with its source for visitors', async () => {
    api.getBenchmarks.mockResolvedValue([ROW])
    render(<BenchmarksSection gadgetId="g1" isAdmin={false} />)
    expect(await screen.findByText('Genshin Impact')).toBeTruthy()
    expect(screen.getByText('52')).toBeTruthy()
    expect(screen.getByRole('link', { name: /example\.com/ }).getAttribute('href')).toBe(ROW.source_url)
    expect(screen.queryByRole('button', { name: /Delete/ })).toBeNull()
  })

  it('renders nothing for visitors when a phone has no benchmarks', async () => {
    api.getBenchmarks.mockResolvedValue([])
    const { container } = render(<BenchmarksSection gadgetId="g1" isAdmin={false} />)
    await waitFor(() => expect(api.getBenchmarks).toHaveBeenCalled())
    expect(container.textContent).toBe('')
  })

  it('lets an admin add a result', async () => {
    api.getBenchmarks.mockResolvedValue([])
    api.addBenchmark.mockResolvedValue({ ...ROW, id: 'b2', test: 'PUBG Mobile', value: 60 })
    render(<BenchmarksSection gadgetId="g1" isAdmin />)
    await screen.findByText(/No benchmarks yet/)
    fireEvent.change(screen.getByLabelText('Game'), { target: { value: 'PUBG Mobile' } })
    fireEvent.change(screen.getByLabelText('Result'), { target: { value: '60' } })
    fireEvent.change(screen.getByLabelText('Source link'), { target: { value: 'https://example.com/r' } })
    fireEvent.click(screen.getByRole('button', { name: 'Add' }))
    expect(await screen.findByText('PUBG Mobile')).toBeTruthy()
    expect(api.addBenchmark).toHaveBeenCalledWith('g1', expect.objectContaining({ kind: 'game', test: 'PUBG Mobile', value: 60, unit: 'fps', settings: null }))
  })

  it('shows the API error when an add fails', async () => {
    api.getBenchmarks.mockResolvedValue([])
    api.addBenchmark.mockRejectedValue(Object.assign(new Error('Add the link where this result was published.'), { status: 422 }))
    render(<BenchmarksSection gadgetId="g1" isAdmin />)
    await screen.findByText(/No benchmarks yet/)
    fireEvent.change(screen.getByLabelText('Game'), { target: { value: 'X' } })
    fireEvent.change(screen.getByLabelText('Result'), { target: { value: '1' } })
    fireEvent.change(screen.getByLabelText('Source link'), { target: { value: 'https://e.com' } })
    fireEvent.click(screen.getByRole('button', { name: 'Add' }))
    expect(await screen.findByRole('alert')).toBeTruthy()
  })
})

describe('BenchmarksSection after a failed load (bug sweep, 24 Nov 2026)', () => {
  it('still lets an admin add, and a successful reload clears the old error', async () => {
    api.getBenchmarks.mockRejectedValueOnce(Object.assign(new Error('Server down'), { status: 503 }))
    const { container, rerender } = render(<BenchmarksSection gadgetId="g1" isAdmin reloadKey={0} />)
    await waitFor(() => expect(container.querySelector('p.text-red-700')).toBeTruthy())
    expect(screen.getByLabelText('Source link')).toBeTruthy()
    api.getBenchmarks.mockResolvedValueOnce([ROW])
    rerender(<BenchmarksSection gadgetId="g1" isAdmin reloadKey={1} />)
    expect(await screen.findByText('Genshin Impact')).toBeTruthy()
    expect(container.querySelector('p.text-red-700')).toBeNull()
  })
})
