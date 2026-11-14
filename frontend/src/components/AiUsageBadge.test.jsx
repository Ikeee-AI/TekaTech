import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, render, screen } from '@testing-library/react'

const m = vi.hoisted(() => ({ user: { id: 'u1' }, usage: { limit: 20, remaining: 17, resets_at: 'x' } }))
vi.mock('../hooks/useAuth', () => ({ useAuth: () => ({ user: m.user }) }))
vi.mock('../api/client', () => ({
  AI_USAGE_EVENT: 'tekatech:ai-usage-changed',
  api: { getAiUsage: vi.fn(() => Promise.resolve(m.usage)) },
}))

const { default: AiUsageBadge } = await import('./AiUsageBadge')

afterEach(() => {
  cleanup()
  m.user = { id: 'u1' }
  m.usage = { limit: 20, remaining: 17, resets_at: 'x' }
})

describe('AiUsageBadge', () => {
  it('shows how many AI questions are left today', async () => {
    render(<AiUsageBadge />)
    expect(await screen.findByText('17 of 20 AI questions left today')).toBeTruthy()
  })

  it('refreshes after a question is asked', async () => {
    render(<AiUsageBadge />)
    await screen.findByText('17 of 20 AI questions left today')
    m.usage = { limit: 20, remaining: 0, resets_at: 'x' }
    await act(async () => window.dispatchEvent(new Event('tekatech:ai-usage-changed')))
    expect(await screen.findByText(/No AI questions left today/)).toBeTruthy()
  })

  it('shows nothing for admins (no limit) or signed-out visitors', async () => {
    m.usage = { limit: null, remaining: null, resets_at: null }
    const { container } = render(<AiUsageBadge />)
    await act(async () => {})
    expect(container.textContent).toBe('')
    cleanup()
    m.user = null
    const second = render(<AiUsageBadge />)
    expect(second.container.textContent).toBe('')
  })
})
