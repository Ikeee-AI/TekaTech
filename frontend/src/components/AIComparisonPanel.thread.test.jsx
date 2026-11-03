// Per-gadget AI conversation (user_questions.sql): a signed-in user's earlier questions
// about one gadget load above the question box, a finished answer joins them when the user
// asks again, and "Clear Conversation" removes them. Signed out or comparing: no requests.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AuthContext } from '../context/authContextValue'
import { api } from '../api/client'
import AIComparisonPanel from './AIComparisonPanel'
import { toThreadTurn } from '../hooks/useGadgetThread'

vi.mock('../api/client', () => ({
  api: {
    askQuestion: vi.fn(),
    getSpecs: vi.fn(),
    getGadgetQuestions: vi.fn(),
    clearGadgetQuestions: vi.fn(),
  },
}))

const answer = (text) => ({
  answer: text,
  sources: [{ gadget_name: 'Pixel 9', content: 'Battery: 4700 mAh' }],
  answer_basis: 'specs',
})
const SAVED = [
  { id: 'q1', question: 'What chip does it use?', asked_at: '2026-11-03T02:00:00Z', response: answer('Tensor G4 [1].') },
]

beforeEach(() => {
  api.getSpecs.mockResolvedValue([{ indexing_status: 'indexed' }])
  api.getGadgetQuestions.mockResolvedValue(SAVED)
  api.clearGadgetQuestions.mockResolvedValue(null)
  api.askQuestion.mockResolvedValue(answer('It lasts about a day [1].'))
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  localStorage.clear()
})

function renderPanel({ user = { id: 'u1' }, ids = ['g1'], names = ['Pixel 9'] } = {}) {
  render(
    <MemoryRouter>
      <AuthContext.Provider value={{ user }}>
        <AIComparisonPanel gadgetIds={ids} gadgetNames={names} defaultQuestion="" buttonLabel="Ask" />
      </AuthContext.Provider>
    </MemoryRouter>,
  )
}

describe('gadget AI thread', () => {
  it('shows the signed-in user’s earlier questions for this gadget', async () => {
    renderPanel()
    expect(await screen.findByText('What chip does it use?')).toBeTruthy()
    expect(screen.getByText(/Tensor G4/)).toBeTruthy()
    expect(api.getGadgetQuestions).toHaveBeenCalledWith('g1')
  })

  it('does not load a thread when signed out or comparing gadgets', async () => {
    renderPanel({ user: null })
    cleanup()
    renderPanel({ ids: ['g1', 'g2'], names: ['Pixel 9', 'iPhone 16'] })
    await waitFor(() => expect(api.getSpecs).toHaveBeenCalled())
    expect(api.getGadgetQuestions).not.toHaveBeenCalled()
    expect(screen.queryByText('Your Earlier Questions')).toBeNull()
  })

  it('moves the finished answer into the thread on "Ask Another Question"', async () => {
    renderPanel()
    await screen.findByText('What chip does it use?')
    fireEvent.change(screen.getByLabelText('Question to Ask'), { target: { value: 'How long does the battery last?' } })
    fireEvent.click(screen.getByRole('button', { name: 'Ask' }))
    await screen.findByText(/It lasts about a day/)
    fireEvent.click(screen.getByRole('button', { name: /Ask Another Question/ }))
    const thread = screen.getByRole('list', { name: 'Your Earlier Questions' })
    expect(thread.textContent).toContain('How long does the battery last?')
    expect(thread.textContent).toContain('It lasts about a day')
    expect(screen.getAllByText(/It lasts about a day/)).toHaveLength(1)
  })

  it('clears the thread after confirming', async () => {
    renderPanel()
    await screen.findByText('What chip does it use?')
    fireEvent.click(screen.getByRole('button', { name: /Clear Conversation/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Clear' }))
    await waitFor(() => expect(screen.queryByText('What chip does it use?')).toBeNull())
    expect(api.clearGadgetQuestions).toHaveBeenCalledWith('g1')
  })

  it('shows a plain warning when the thread cannot load, and the box still works', async () => {
    api.getGadgetQuestions.mockRejectedValue(Object.assign(new Error("Couldn't load your earlier questions right now."), { status: 503 }))
    renderPanel()
    expect(await screen.findByText("Couldn't load your earlier questions right now.")).toBeTruthy()
    expect(screen.getByLabelText('Question to Ask')).toBeTruthy()
  })

  it('drops a stored turn whose answer no longer validates', () => {
    expect(toThreadTurn({ id: 'x', question: 'q', asked_at: null, response: { answer: '' } })).toBeNull()
  })
})
