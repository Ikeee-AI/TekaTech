// The opt-in general-knowledge toggle (#172): off by default, and the /query body only
// carries allow_general_knowledge when the user turned it on, so a request with it off
// is exactly what it was before the feature.
import { afterEach, describe, expect, it } from 'vitest'
import { act, cleanup, renderHook } from '@testing-library/react'
import { answerRequestOptions, useAiAnswer } from './useAiAnswer'

afterEach(() => {
  cleanup()
  localStorage.clear()
})

describe('answerRequestOptions', () => {
  it('leaves allow_general_knowledge out when it is off', () => {
    expect(answerRequestOptions({ plainLanguage: false, allowGeneralKnowledge: false })).toEqual({ plain_language: false })
  })

  it('sends allow_general_knowledge: true when it is on', () => {
    expect(answerRequestOptions({ plainLanguage: true, allowGeneralKnowledge: true })).toEqual({
      plain_language: true,
      allow_general_knowledge: true,
    })
  })

  it('sends allow_web_search: true only when it is on', () => {
    expect(answerRequestOptions({ plainLanguage: false, allowWebSearch: true })).toEqual({
      plain_language: false,
      allow_web_search: true,
    })
    expect(answerRequestOptions({ plainLanguage: false, allowWebSearch: false })).toEqual({ plain_language: false })
  })
})

describe('useAiAnswer general-knowledge toggle', () => {
  it('starts off, even when plain language was saved as on', () => {
    localStorage.setItem('tekatech:plainLanguage', 'true')
    const { result } = renderHook(() => useAiAnswer())
    expect(result.current.allowGeneralKnowledge).toBe(false)
    expect(result.current.requestOptions).toEqual({ plain_language: true })
  })

  it('adds the flag to the request options once turned on, and removes it again', () => {
    const { result } = renderHook(() => useAiAnswer())
    act(() => result.current.setAllowGeneralKnowledge(true))
    expect(result.current.requestOptions).toEqual({ plain_language: false, allow_general_knowledge: true })
    act(() => result.current.setAllowGeneralKnowledge(false))
    expect(result.current.requestOptions).toEqual({ plain_language: false })
  })

  it('is not saved between visits', () => {
    const first = renderHook(() => useAiAnswer())
    act(() => first.result.current.setAllowGeneralKnowledge(true))
    first.unmount()
    const { result } = renderHook(() => useAiAnswer())
    expect(result.current.allowGeneralKnowledge).toBe(false)
  })
})

describe('useAiAnswer streaming reset (bug sweep, 24 Nov 2026)', () => {
  it('onReset clears the streamed decline and its sources; an older stream cannot reset a newer one', () => {
    const { result } = renderHook(() => useAiAnswer())
    let first
    act(() => { first = result.current.startStream() })
    act(() => {
      first.onSources([{ gadget_name: 'S24' }])
      first.onDelta('The snippets do not state it.')
    })
    expect(result.current.streamText).toBe('The snippets do not state it.')
    act(() => first.onReset())
    expect(result.current.streamText).toBe('')
    expect(result.current.streamSources).toEqual([])

    let second
    act(() => { second = result.current.startStream() })
    act(() => second.onDelta('New answer'))
    act(() => first.onReset())
    expect(result.current.streamText).toBe('New answer')
  })
})
