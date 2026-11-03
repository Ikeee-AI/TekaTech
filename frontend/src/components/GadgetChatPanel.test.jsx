// The gadget page's chat (GadgetChatPanel): a signed-in user's saved turns load into a
// scrollable conversation, Enter sends and Shift+Enter does not, a finished answer joins the
// conversation when the next question is sent, and "New Chat" deletes the saved thread.
// Signed out, nothing is loaded or saved but the chat still works for the page view.
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AuthContext } from '../context/authContextValue'
import { api } from '../api/client'
import GadgetChatPanel from './GadgetChatPanel'
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

beforeAll(() => {
  // jsdom has no layout: give scrollTo a no-op so the auto-scroll code runs.
  Element.prototype.scrollTo = function scrollTo() {}
})

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

function renderPanel({ user = { id: 'u1' } } = {}) {
  render(
    <MemoryRouter>
      <AuthContext.Provider value={{ user }}>
        <GadgetChatPanel gadgetId="g1" gadgetName="Pixel 9" suggestions={['Is it water resistant?']} />
      </AuthContext.Provider>
    </MemoryRouter>,
  )
}

const composer = () => screen.getByLabelText('Ask about Pixel 9')
const conversation = () => screen.getByRole('region', { name: 'Conversation about Pixel 9' })

describe('GadgetChatPanel', () => {
  it('loads the signed-in user’s saved turns into the conversation', async () => {
    renderPanel()
    expect(await within(conversation()).findByText('What chip does it use?')).toBeTruthy()
    expect(within(conversation()).getByText(/Tensor G4/)).toBeTruthy()
    expect(api.getGadgetQuestions).toHaveBeenCalledWith('g1')
  })

  it('the conversation area scrolls instead of growing the page', async () => {
    renderPanel()
    await screen.findByText('What chip does it use?')
    expect(conversation().className).toMatch(/overflow-y-auto/)
    expect(conversation().className).toMatch(/max-h-/)
  })

  it('Enter sends, Shift+Enter does not', async () => {
    renderPanel()
    await screen.findByText('What chip does it use?')
    fireEvent.change(composer(), { target: { value: 'How long does the battery last?' } })
    fireEvent.keyDown(composer(), { key: 'Enter', shiftKey: true })
    expect(api.askQuestion).not.toHaveBeenCalled()
    fireEvent.keyDown(composer(), { key: 'Enter' })
    expect(api.askQuestion).toHaveBeenCalledWith(
      expect.objectContaining({ question: 'How long does the battery last?', gadget_ids: ['g1'] }),
    )
    expect(composer().value).toBe('')
    expect(await screen.findByText(/It lasts about a day/)).toBeTruthy()
  })

  it('a finished answer stays in the conversation when the next question is sent', async () => {
    renderPanel()
    await screen.findByText('What chip does it use?')
    fireEvent.change(composer(), { target: { value: 'How long does the battery last?' } })
    fireEvent.click(screen.getByRole('button', { name: 'Send question' }))
    await screen.findByText(/It lasts about a day/)
    api.askQuestion.mockResolvedValue(answer('Yes, IP68 [1].'))
    fireEvent.change(composer(), { target: { value: 'Is it water resistant?' } })
    fireEvent.click(screen.getByRole('button', { name: 'Send question' }))
    await screen.findByText(/IP68/)
    const text = conversation().textContent
    expect(text).toContain('What chip does it use?')
    expect(text).toContain('It lasts about a day')
    expect(text).toContain('Is it water resistant?')
    expect(screen.getAllByText(/It lasts about a day/)).toHaveLength(1)
  })

  it('Regenerate re-asks with regenerate: true and keeps a single copy of the turn', async () => {
    renderPanel()
    await screen.findByText('What chip does it use?')
    fireEvent.change(composer(), { target: { value: 'How long does the battery last?' } })
    fireEvent.keyDown(composer(), { key: 'Enter' })
    await screen.findByText(/It lasts about a day/)
    expect(api.askQuestion.mock.calls[0][0].regenerate).toBeUndefined()
    api.askQuestion.mockResolvedValue(answer('About 24 hours [1].'))
    fireEvent.click(screen.getByRole('button', { name: /Regenerate/ }))
    await screen.findByText(/About 24 hours/)
    expect(api.askQuestion.mock.calls[1][0]).toMatchObject({ question: 'How long does the battery last?', regenerate: true })
    expect(screen.queryByText(/It lasts about a day/)).toBeNull()
    expect(screen.getAllByText('How long does the battery last?')).toHaveLength(1)
  })

  it('retrying after an error does not send regenerate', async () => {
    api.askQuestion.mockRejectedValueOnce(Object.assign(new Error('The AI service is unavailable.'), { status: 503 }))
    renderPanel()
    await screen.findByText('What chip does it use?')
    fireEvent.change(composer(), { target: { value: 'How long does the battery last?' } })
    fireEvent.keyDown(composer(), { key: 'Enter' })
    fireEvent.click(await screen.findByRole('button', { name: /try again|retry/i }))
    await screen.findByText(/It lasts about a day/)
    expect(api.askQuestion.mock.calls[1][0].regenerate).toBeUndefined()
  })

  it('New Chat deletes the saved conversation after confirming', async () => {
    renderPanel()
    await screen.findByText('What chip does it use?')
    fireEvent.click(screen.getByRole('button', { name: /New Chat/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))
    await waitFor(() => expect(screen.queryByText('What chip does it use?')).toBeNull())
    expect(api.clearGadgetQuestions).toHaveBeenCalledWith('g1')
    expect(screen.getByText('What would you like to know about Pixel 9?')).toBeTruthy()
  })

  it('signed out: nothing is loaded, suggestions still ask, and a log-in hint shows', async () => {
    renderPanel({ user: null })
    expect(screen.getByText(/to keep this conversation/)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Is it water resistant?' }))
    expect(await screen.findByText(/It lasts about a day/)).toBeTruthy()
    expect(api.getGadgetQuestions).not.toHaveBeenCalled()
  })

  it('a thread that cannot load shows a plain warning and the chat still works', async () => {
    api.getGadgetQuestions.mockRejectedValue(Object.assign(new Error("Couldn't load your earlier questions right now."), { status: 503 }))
    renderPanel()
    expect(await screen.findByText("Couldn't load your earlier questions right now.")).toBeTruthy()
    expect(composer()).toBeTruthy()
  })

  it('drops a stored turn whose answer no longer validates', () => {
    expect(toThreadTurn({ id: 'x', question: 'q', asked_at: null, response: { answer: '' } })).toBeNull()
  })
})
