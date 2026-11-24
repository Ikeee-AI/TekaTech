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

  it('says so when the search found nothing', async () => {
    api.draftFromWeb.mockResolvedValue({ kind: 'specs', specs: [], benchmarks: [] })
    render(<WebDraftPanel gadgetId="g1" />)
    fireEvent.click(screen.getByRole('button', { name: 'Find specs' }))
    expect((await screen.findByRole('alert')).textContent).toMatch(/found nothing/)
  })
})
