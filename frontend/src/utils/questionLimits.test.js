import { describe, expect, it } from 'vitest'
import { MAX_QUESTION_CHARS, questionTooLongError } from './questionLimits'

describe('questionTooLongError', () => {
  it('matches the backend limit of 150 characters', () => {
    expect(MAX_QUESTION_CHARS).toBe(150)
  })

  it('accepts an empty question and one exactly at the limit', () => {
    expect(questionTooLongError('')).toBeNull()
    expect(questionTooLongError('a'.repeat(MAX_QUESTION_CHARS))).toBeNull()
  })

  it('returns a 422 error naming the length one character over the limit', () => {
    const err = questionTooLongError('a'.repeat(MAX_QUESTION_CHARS + 1))
    expect(err).toBeInstanceOf(Error)
    expect(err.status).toBe(422)
    expect(err.message).toBe('Question is too long: 151 characters; the limit is 150.')
  })

  it('counts an emoji (two UTF-16 units) as one character, like the backend', () => {
    const emojis = '📱'.repeat(MAX_QUESTION_CHARS)
    expect(emojis.length).toBe(MAX_QUESTION_CHARS * 2)
    expect(questionTooLongError(emojis)).toBeNull()
    expect(questionTooLongError(emojis + '📱').message).toContain('151 characters')
  })
})
