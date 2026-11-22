// The AI loading state: friendly steps that move on every few seconds, comparison
// wording on Compare, an "almost there" note for slow answers, and one steady status
// for screen readers (the changing line is aria-hidden so it isn't re-announced).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AuthContext } from '../context/authContextValue'
import AiAnswerResult from './AiAnswerResult'

beforeEach(() => vi.useFakeTimers())
afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

function renderLoading(props = {}) {
  render(
    <MemoryRouter>
      <AuthContext.Provider value={{ user: null }}>
        <AiAnswerResult loading error={null} result={null} sourceRefs={{ current: [] }} {...props} />
      </AuthContext.Provider>
    </MemoryRouter>,
  )
}

describe('AI loading state', () => {
  it('walks through friendly steps, then says it is almost there', () => {
    renderLoading()
    expect(screen.getByText('Reading up on this phone…')).toBeTruthy()
    act(() => vi.advanceTimersByTime(2_400))
    expect(screen.getByText('Picking out the details that answer your question…')).toBeTruthy()
    act(() => vi.advanceTimersByTime(10_000))
    expect(screen.getByText(/Almost there/)).toBeTruthy()
    expect(screen.queryByText(/Searching the spec sheets/)).toBeNull()
  })

  it('uses comparison wording on Compare', () => {
    renderLoading({ variant: 'compare' })
    expect(screen.getByText('Lining the phones up side by side…')).toBeTruthy()
  })

  it('gives screen readers one steady status', () => {
    renderLoading()
    expect(screen.getByText('Working on your answer…').className).toContain('sr-only')
    expect(screen.getByText('Reading up on this phone…').getAttribute('aria-hidden')).toBe('true')
  })
})
