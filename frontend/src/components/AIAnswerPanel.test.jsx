// The /query body from the search-answer panel (#172): no allow_general_knowledge by
// default; once the box is ticked, the next ask (Regenerate) sends it as true. Like
// Plain-Language Answer, ticking it does not re-ask on its own.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AuthContext } from '../context/authContextValue'
import { api } from '../api/client'
import AIAnswerPanel from './AIAnswerPanel'

vi.mock('../api/client', () => ({ api: { askQuestion: vi.fn() } }))

const GROUNDED = {
  answer: 'The Pixel 9 has a 4700 mAh battery [1].',
  sources: [{ gadget_name: 'Pixel 9', content: 'Battery: 4700 mAh' }],
  answer_basis: 'specs',
}

beforeEach(() => {
  api.askQuestion.mockReset()
  api.askQuestion.mockResolvedValue(GROUNDED)
})

afterEach(() => {
  cleanup()
  localStorage.clear()
})

function renderPanel() {
  render(
    <MemoryRouter>
      <AuthContext.Provider value={{ user: null }}>
        <AIAnswerPanel question="How big is the Pixel 9 battery?" onClose={() => {}} />
      </AuthContext.Provider>
    </MemoryRouter>,
  )
}

describe('AIAnswerPanel request body', () => {
  // The streaming handlers ride along in the same object and are stripped before sending.
  const sentBody = ({ onDelta, onSources, ...body }) => {
    expect(typeof onDelta).toBe('function')
    expect(typeof onSources).toBe('function')
    return body
  }

  it('asks without allow_general_knowledge by default', async () => {
    renderPanel()
    await screen.findByText('Answer based on 1 cited spec')
    expect(api.askQuestion).toHaveBeenCalledOnce()
    expect(sentBody(api.askQuestion.mock.calls[0][0])).toEqual({ question: 'How big is the Pixel 9 battery?', plain_language: false })
  })

  it('sends allow_general_knowledge: true on the next ask once ticked, without re-asking by itself', async () => {
    renderPanel()
    await screen.findByText('Answer based on 1 cited spec')
    fireEvent.click(screen.getByRole('checkbox', { name: 'Allow General Knowledge' }))
    expect(api.askQuestion).toHaveBeenCalledOnce()

    fireEvent.click(screen.getByRole('button', { name: 'Regenerate' }))
    await screen.findByText('Answer based on 1 cited spec')
    expect(api.askQuestion).toHaveBeenCalledTimes(2)
    expect(sentBody(api.askQuestion.mock.calls[1][0])).toEqual({
      question: 'How big is the Pixel 9 battery?',
      plain_language: false,
      allow_general_knowledge: true,
    })
  })

  it('says general knowledge is on in the intro only while the box is ticked', async () => {
    renderPanel()
    await screen.findByText('Answer based on 1 cited spec')
    expect(screen.getByText(/Answers use only the specs saved in TekaTech/)).toBeTruthy()
    expect(screen.queryByText(/General knowledge is on/)).toBeNull()

    fireEvent.click(screen.getByRole('checkbox', { name: 'Allow General Knowledge' }))
    expect(screen.getByText(/General knowledge is on/)).toBeTruthy()
    expect(screen.queryByText(/Answers use only the specs saved/)).toBeNull()

    fireEvent.click(screen.getByRole('checkbox', { name: 'Allow General Knowledge' }))
    expect(screen.getByText(/Answers use only the specs saved in TekaTech/)).toBeTruthy()
  })
})
