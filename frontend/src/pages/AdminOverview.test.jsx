// #206: the admin overview shows what GET /admin/overview returns, with the spend caveat visible.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { api } from '../api/client'
import AdminOverview from './AdminOverview'
import { formatUsd } from '../utils/formatUsd'

vi.mock('../api/client', () => ({ api: { getAdminOverview: vi.fn() } }))

const day = (date, questions, cost = 0) => ({
  date, questions, embedding_tokens: 0, prompt_tokens: questions * 1000, completion_tokens: questions * 500, estimated_cost_usd: cost,
})

const OVERVIEW = {
  generated_at: '2026-11-13T06:30:00+00:00',
  catalog: {
    gadgets: 3,
    gadgets_with_indexed_specs: 1,
    gadgets_without_specs: ['Rog Ally'],
    spec_chunks: { total: 3, indexed: 2, not_indexed: 1 },
    per_gadget: [
      { id: 'g1', name: 'iPhone 15', indexed: 2, pending: 0 },
      { id: 'g2', name: 'Poco x7 Pro', indexed: 0, pending: 1 },
      { id: 'g3', name: 'Rog Ally', indexed: 0, pending: 0 },
    ],
  },
  usage: {
    window_days: 2,
    timezone: 'Asia/Manila',
    days: [day('2026-11-12', 1, 0.0013), day('2026-11-13', 3, 0.0039)],
    totals: { questions: 4, embedding_tokens: 0, prompt_tokens: 4000, completion_tokens: 2000, estimated_cost_usd: 0.0052 },
    token_columns_present: true,
    rows_without_tokens: 0,
    truncated: false,
    prices_per_million_usd: { embedding: 0.02, chat_input: 0.25, chat_output: 2.0 },
    spend_note: 'Estimate for logged answers only. Check the OpenAI dashboard for the actual balance.',
  },
  users: { accounts: null, my_gadgets_lists: 5 },
}

function renderPage() {
  render(
    <MemoryRouter>
      <AdminOverview />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  api.getAdminOverview.mockReset()
})
afterEach(cleanup)

describe('AdminOverview', () => {
  it('shows catalog readiness, usage with the spend caveat, and user counts', async () => {
    api.getAdminOverview.mockResolvedValue(OVERVIEW)
    renderPage()

    expect(await screen.findByRole('heading', { name: /Admin Overview/ })).toBeTruthy()
    expect(screen.getByText('1 of 3')).toBeTruthy()
    expect(screen.getByText(/Rog Ally\. AI questions about them get/)).toBeTruthy()
    expect(screen.getByText('$0.0052')).toBeTruthy()
    expect(screen.getByText(/Estimate for logged answers only/)).toBeTruthy()
    expect(screen.getByText('Unavailable')).toBeTruthy()
    expect(screen.getByText('5')).toBeTruthy()
    // newest day first
    const rows = screen.getAllByRole('row')
    expect(rows[rows.length - 2].textContent).toMatch(/Nov 13/)
  })

  it('offers a retry when loading fails', async () => {
    api.getAdminOverview.mockRejectedValueOnce(Object.assign(new Error('boom'), { status: 503 })).mockResolvedValue(OVERVIEW)
    renderPage()

    expect(await screen.findByText(/Couldn't Load the Overview/)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /try again|retry/i }))
    await waitFor(() => expect(screen.getByRole('heading', { name: /Admin Overview/ })).toBeTruthy())
    expect(api.getAdminOverview).toHaveBeenCalledTimes(2)
  })

  it('formats spend with enough digits for fractions of a cent', () => {
    expect(formatUsd(0.0052)).toBe('$0.0052')
    expect(formatUsd(3.5)).toBe('$3.50')
    expect(formatUsd(null)).toBe('—')
  })
})
