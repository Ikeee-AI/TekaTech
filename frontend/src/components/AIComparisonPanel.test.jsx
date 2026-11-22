import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AuthContext } from '../context/authContextValue'
import { api } from '../api/client'
import AIComparisonPanel from './AIComparisonPanel'

vi.mock('../api/client', () => ({
  api: { askQuestion: vi.fn(), getSpecs: vi.fn(), getComparisonQuestions: vi.fn(), clearComparisonQuestions: vi.fn() },
}))

const answer = (text) => ({
  answer: text,
  sources: [{ gadget_name: 'V50 5G', content: 'Charging: 90W' }],
  answer_basis: 'specs',
})

beforeAll(() => {
  Element.prototype.scrollIntoView = function scrollIntoView() {}
})

beforeEach(() => {
  api.getSpecs.mockResolvedValue([{ indexing_status: 'indexed' }])
  api.askQuestion.mockResolvedValue(answer('The V50 charges fastest at 90W [1].'))
  api.getComparisonQuestions.mockResolvedValue([])
  api.clearComparisonQuestions.mockResolvedValue(null)
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

function renderPanel(ids = ['g1', 'g2']) {
  const ui = (gadgetIds) => (
    <MemoryRouter>
      <AuthContext.Provider value={{ user: { id: 'u1' } }}>
        <AIComparisonPanel gadgetIds={gadgetIds} gadgetNames={gadgetIds.map((g) => `Phone ${g}`)} />
      </AuthContext.Provider>
    </MemoryRouter>
  )
  const view = render(ui(ids))
  return { rerender: (next) => view.rerender(ui(next)) }
}

async function askAnother(question) {
  fireEvent.click(screen.getByRole('button', { name: 'Ask Another Question' }))
  fireEvent.change(screen.getByLabelText('Question to Ask'), { target: { value: question } })
  fireEvent.click(screen.getByRole('button', { name: 'Generate Comparison' }))
}

describe('AIComparisonPanel chat memory', () => {
  it('sends no history first, then the earlier turn with a follow-up', async () => {
    renderPanel()
    fireEvent.click(screen.getByRole('button', { name: 'Which offers better value for the price?' }))
    await screen.findByText(/charges fastest/)
    expect(api.askQuestion.mock.calls[0][0]).not.toHaveProperty('history')
    expect(screen.getByText('Saved to your account. Follow-ups remember your last 1 question.')).toBeTruthy()

    await askAnother('Which one is lighter?')
    await screen.findByText(/charges fastest/)
    expect(api.askQuestion).toHaveBeenLastCalledWith(
      expect.objectContaining({
        question: 'Which one is lighter?',
        gadget_ids: ['g1', 'g2'],
        history: [{ question: 'Which offers better value for the price?', answer: 'The V50 charges fastest at 90W [1].' }],
      }),
    )
  })

  it('a failed answer is not remembered', async () => {
    api.askQuestion.mockRejectedValueOnce(new Error('boom'))
    renderPanel()
    fireEvent.click(screen.getByRole('button', { name: 'Compare battery life' }))
    await screen.findByRole('button', { name: /try again/i })
    fireEvent.click(screen.getByRole('button', { name: /try again/i }))
    await screen.findByText(/charges fastest/)
    expect(api.askQuestion.mock.calls[1][0]).not.toHaveProperty('history')
  })

  it('New Chat and a different set of phones forget the conversation', async () => {
    const { rerender } = renderPanel()
    fireEvent.click(screen.getByRole('button', { name: 'Compare battery life' }))
    await screen.findByText(/charges fastest/)
    fireEvent.click(screen.getByRole('button', { name: 'New Chat' }))
    fireEvent.click(screen.getByRole('button', { name: 'Clear' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Compare camera quality' }))
    expect(api.clearComparisonQuestions).toHaveBeenCalledWith(['g1', 'g2'])
    await screen.findByText(/charges fastest/)
    expect(api.askQuestion.mock.calls[1][0]).not.toHaveProperty('history')

    rerender(['g1', 'g3'])
    await screen.findByText(/charges fastest/)
    await askAnother('Which one is lighter?')
    await screen.findByText(/charges fastest/)
    expect(api.askQuestion.mock.calls.at(-1)[0]).not.toHaveProperty('history')
  })

  it('shows the answer as it streams, then the finished answer replaces it', async () => {
    let finish
    api.askQuestion.mockImplementation(({ onSources, onDelta }) => {
      onSources([{ gadget_name: 'V50 5G', content: 'Charging: 90W' }])
      onDelta('The V50 ')
      onDelta('charges first')
      return new Promise((resolve) => { finish = resolve })
    })
    renderPanel()
    fireEvent.click(screen.getByRole('button', { name: 'Compare battery life' }))
    expect(await screen.findByText(/The V50 charges first/)).toBeTruthy()
    expect(screen.getByText('Writing your answer…')).toBeTruthy()
    finish(answer('Final: the V50 charges fastest at 90W [1].'))
    expect(await screen.findByText(/Final: the V50 charges fastest/)).toBeTruthy()
    expect(screen.queryByText(/The V50 charges first/)).toBeNull()
  })

  it('shows the saved conversation for these phones and sends it as history', async () => {
    api.getComparisonQuestions.mockResolvedValue([
      { id: 's1', question: 'Compare battery life', asked_at: '2026-11-22T10:00:00Z', response: answer('Both have 6000 mAh [1].') },
    ])
    renderPanel(['g2', 'g1'])
    expect(await screen.findByText(/Both have 6000 mAh/)).toBeTruthy()
    expect(api.getComparisonQuestions).toHaveBeenCalledWith(['g1', 'g2'])
    fireEvent.click(screen.getByRole('button', { name: 'Compare camera quality' }))
    await screen.findByText(/charges fastest/)
    expect(api.askQuestion).toHaveBeenLastCalledWith(
      expect.objectContaining({ history: [{ question: 'Compare battery life', answer: 'Both have 6000 mAh [1].' }] }),
    )
    // The saved turn stays above the new answer.
    expect(screen.getByRole('list', { name: 'Earlier questions about these phones' }).textContent).toContain('Compare battery life')
  })
})
