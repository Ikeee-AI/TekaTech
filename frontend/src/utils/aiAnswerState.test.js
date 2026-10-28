import { describe, expect, it } from 'vitest'
import {
  MalformedAnswerError,
  describeAiFailure,
  isMissingEvidence,
  validateAnswerResponse,
} from './aiAnswerState'

function httpError(status, message = '') {
  const err = new Error(message)
  err.status = status
  return err
}

describe('validateAnswerResponse', () => {
  const good = {
    answer: 'The Pixel 9 has 4700 mAh [1].',
    sources: [{ content: 'Battery: 4700 mAh', gadget_name: 'Pixel 9' }],
  }

  it('returns a well-formed response unchanged', () => {
    expect(validateAnswerResponse(good)).toBe(good)
  })

  it('accepts an answer with an empty source list (missing evidence is not malformed)', () => {
    const data = { answer: 'No specs on file.', sources: [] }
    expect(validateAnswerResponse(data)).toBe(data)
  })

  it.each([
    ['null', null],
    ['a string', 'oops'],
    ['an HTML error page', '<html>502 Bad Gateway</html>'],
    ['a missing answer', { sources: [] }],
    ['a whitespace-only answer', { answer: '  \n ', sources: [] }],
    ['a non-string answer', { answer: 42, sources: [] }],
    ['missing sources', { answer: 'Hi' }],
    ['sources as an object', { answer: 'Hi', sources: {} }],
    ['a null source', { answer: 'Hi', sources: [null] }],
    ['a source without content', { answer: 'Hi', sources: [{ gadget_name: 'Pixel 9' }] }],
    ['a source without gadget_name', { answer: 'Hi', sources: [{ content: 'x' }] }],
  ])('rejects %s', (_label, data) => {
    expect(() => validateAnswerResponse(data)).toThrow(MalformedAnswerError)
  })
})

describe('isMissingEvidence', () => {
  it('is true only when no sources came back', () => {
    expect(isMissingEvidence({ sources: [] })).toBe(true)
    expect(isMissingEvidence({ sources: [{}] })).toBe(false)
  })
})

describe('describeAiFailure', () => {
  it.each([
    ['a MalformedAnswerError', new MalformedAnswerError('x'), 'malformed'],
    ['a JSON SyntaxError', new SyntaxError('Unexpected token <'), 'malformed'],
    ['a fetch TypeError (offline)', new TypeError('Failed to fetch'), 'network'],
    ['the backend timeout 503', httpError(503, 'The AI took too long to answer. Try again.'), 'timeout'],
    ['the backend unusable-answer 503', httpError(503, "The AI returned an answer we couldn't use. Try again."), 'malformed'],
    ['any other 503', httpError(503, 'Service Unavailable'), 'unavailable'],
    ['a 503 without a message', httpError(503, undefined), 'unavailable'],
    ['a gateway 504', httpError(504), 'timeout'],
    ['a 408', httpError(408), 'timeout'],
    ['a 502', httpError(502), 'unavailable'],
    ['a 429', httpError(429), 'rateLimited'],
    ['a 422', httpError(422, 'Question is too long'), 'invalidQuestion'],
    ['a 400', httpError(400, 'Bad request'), 'invalidQuestion'],
    ['a 500', httpError(500, 'Traceback (most recent call last)'), 'unknown'],
    ['undefined', undefined, 'unknown'],
  ])('classifies %s', (_label, err, kind) => {
    expect(describeAiFailure(err).kind).toBe(kind)
  })

  it('always returns a title and message and never echoes server text for non-422 failures', () => {
    const failure = describeAiFailure(httpError(500, 'Traceback: secret stack frame'))
    expect(failure.title).toBeTruthy()
    expect(failure.message).not.toContain('Traceback')
    expect(failure.retry).toBe(true)
  })

  it('shows a short plain 422 sentence from the backend and disables retry', () => {
    const msg = 'Question is too long: 151 characters; the limit is 150.'
    const failure = describeAiFailure(httpError(422, msg))
    expect(failure.message).toBe(msg)
    expect(failure.retry).toBe(false)
  })

  it.each([
    ['HTML', '<b>bad</b>'],
    ['JSON', '{"detail":[{"loc":["body"]}]}'],
    ['an over-long message', 'x'.repeat(200)],
  ])('replaces a 422 message containing %s with fixed copy', (_label, msg) => {
    expect(describeAiFailure(httpError(422, msg)).message).toBe('Try a shorter, more specific question.')
  })

  it('does not let one result mutate the shared copy for later failures', () => {
    describeAiFailure(httpError(422, 'Custom sentence.'))
    expect(describeAiFailure({ status: 422, message: 123 }).message).toBe('Try a shorter, more specific question.')
  })
})
