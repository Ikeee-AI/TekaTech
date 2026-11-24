import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { api } from '../api/client'
import { groupSpecDrafts } from '../utils/benchmarks'
import WebDraftPanel from './WebDraftPanel'

vi.mock('../api/client', () => ({ api: { draftFromWeb: vi.fn(), ingestSpecs: vi.fn(), addBenchmark: vi.fn() } }))
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }))

beforeEach(() => {
  api.draftFromWeb.mockReset()
  api.ingestSpecs.mockReset()
  api.addBenchmark.mockReset()
})
afterEach(cleanup)

describe('groupSpecDrafts', () => {
  it('saves each page once with its own link', () => {
    expect(
      groupSpecDrafts([
        { text: 'Battery: 4000 mAh', source_url: 'https://a.com' },
        { text: 'Chip: X', source_url: 'https://b.com' },
        { text: 'RAM: 8 GB', source_url: 'https://a.com' },
      ]),
    ).toEqual([
      { source_url: 'https://a.com', raw_text: 'Battery: 4000 mAh\nRAM: 8 GB' },
      { source_url: 'https://b.com', raw_text: 'Chip: X' },
    ])
  })
})

describe('WebDraftPanel', () => {
  it('saves only the spec drafts the admin ticked, then tells the page', async () => {
    api.draftFromWeb.mockResolvedValue({
      kind: 'specs',
      specs: [
        { text: 'Battery: 4000 mAh', source_url: 'https://samsung.com/s24' },
        { text: 'Chip: Exynos 2400', source_url: 'https://samsung.com/s24' },
      ],
      benchmarks: [],
    })
    api.ingestSpecs.mockResolvedValue({ chunks_created: 1 })
    const onSpecsSaved = vi.fn()
    render(<WebDraftPanel gadgetId="g1" onSpecsSaved={onSpecsSaved} />)
    fireEvent.click(screen.getByRole('button', { name: 'Find specs' }))
    fireEvent.click(await screen.findByLabelText(/Battery: 4000 mAh/))
    fireEvent.click(screen.getByRole('button', { name: /Save 1 checked/ }))
    await vi.waitFor(() => expect(onSpecsSaved).toHaveBeenCalled())
    expect(api.ingestSpecs).toHaveBeenCalledWith('g1', { source_url: 'https://samsung.com/s24', raw_text: 'Battery: 4000 mAh' })
    expect(screen.queryByText('Battery: 4000 mAh')).toBeNull()
    expect(screen.getByText('Chip: Exynos 2400')).toBeTruthy()
  })

  it('adds ticked benchmark drafts one by one', async () => {
    const draft = { kind: 'game', test: 'Genshin Impact', settings: 'High', value: 52, unit: 'fps', source_url: 'https://r.com' }
    api.draftFromWeb.mockResolvedValue({ kind: 'benchmarks', specs: [], benchmarks: [draft] })
    api.addBenchmark.mockResolvedValue({ ...draft, id: 'b1' })
    const onBenchmarksSaved = vi.fn()
    render(<WebDraftPanel gadgetId="g1" onBenchmarksSaved={onBenchmarksSaved} />)
    fireEvent.click(screen.getByRole('button', { name: 'Find benchmarks' }))
    fireEvent.click(await screen.findByLabelText(/Genshin Impact/))
    fireEvent.click(screen.getByRole('button', { name: /Save 1 checked/ }))
    await vi.waitFor(() => expect(onBenchmarksSaved).toHaveBeenCalled())
    expect(api.addBenchmark).toHaveBeenCalledWith('g1', draft)
  })

  it('drops the drafts already saved when a later save fails, so a retry never repeats them', async () => {
    const a = { kind: 'score', test: 'Geekbench 6 single-core', settings: null, value: 2235, unit: 'points', source_url: 'https://a.com' }
    const b = { kind: 'score', test: 'Geekbench 6 multi-core', settings: null, value: 6922, unit: 'points', source_url: 'https://a.com' }
    api.draftFromWeb.mockResolvedValue({ kind: 'benchmarks', specs: [], benchmarks: [a, b] })
    api.addBenchmark.mockResolvedValueOnce({ ...a, id: 'b1' }).mockRejectedValueOnce(Object.assign(new Error('Too many'), { status: 429 }))
    const onBenchmarksSaved = vi.fn()
    render(<WebDraftPanel gadgetId="g1" onBenchmarksSaved={onBenchmarksSaved} />)
    fireEvent.click(screen.getByRole('button', { name: 'Find benchmarks' }))
    fireEvent.click(await screen.findByLabelText(/single-core/))
    fireEvent.click(screen.getByLabelText(/multi-core/))
    fireEvent.click(screen.getByRole('button', { name: /Save 2 checked/ }))
    await vi.waitFor(() => expect(onBenchmarksSaved).toHaveBeenCalled())
    expect(screen.queryByLabelText(/single-core/)).toBeNull()
    // The unsaved draft stays ticked, so Save retries only that one.
    expect(screen.getByLabelText(/multi-core/).checked).toBe(true)
    expect(screen.getByRole('button', { name: /Save 1 checked/ })).toBeTruthy()
  })

  it('says so when the search found nothing', async () => {
    api.draftFromWeb.mockResolvedValue({ kind: 'specs', specs: [], benchmarks: [] })
    render(<WebDraftPanel gadgetId="g1" />)
    fireEvent.click(screen.getByRole('button', { name: 'Find specs' }))
    expect((await screen.findByRole('alert')).textContent).toMatch(/found nothing/)
  })
})
