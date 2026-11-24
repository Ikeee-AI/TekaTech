// Turns /query results and failures into the three states a user must be able to
// tell apart: an answer, missing evidence, and an AI/request failure.
// Only messages written here (or the backend's own plain 503 sentences) reach the
// screen, so a stack trace, HTML error page or provider detail is never displayed.

// Plain sentences the backend sends with its 503s (backend/routers/query.py).
const BACKEND_TIMEOUT = 'The AI took too long to answer'
const BACKEND_UNUSABLE = "The AI returned an answer we couldn't use"

export class MalformedAnswerError extends Error {
  constructor(reason) {
    super(`Malformed answer: ${reason}`)
    this.name = 'MalformedAnswerError'
  }
}

/** Returns the response if it has the shape the UI needs; throws MalformedAnswerError otherwise. */
export function validateAnswerResponse(data) {
  if (!data || typeof data !== 'object') throw new MalformedAnswerError('not an object')
  if (typeof data.answer !== 'string' || !data.answer.trim()) throw new MalformedAnswerError('missing answer text')
  if (!Array.isArray(data.sources)) throw new MalformedAnswerError('missing source list')
  const badSource = data.sources.some(
    (s) => !s || typeof s !== 'object' || typeof s.content !== 'string' || typeof s.gadget_name !== 'string',
  )
  if (badSource) throw new MalformedAnswerError('a source is missing its text or gadget name')
  return data
}

/**
 * An opt-in general-knowledge answer (#172): no saved spec matched and the user allowed
 * general knowledge, so the answer has no sources and no citations by design.
 */
export function isGeneralKnowledge(result) {
  return result?.answer_basis === 'general_knowledge'
}

/** An opt-in web-search answer (24 Nov 2026): cited with the web pages it found, unverified. */
export function isWebAnswer(result) {
  return result?.answer_basis === 'web'
}

/** The plain reply when today's web searches are used up (answer_basis "web_limit"). */
export function isWebLimit(result) {
  return result?.answer_basis === 'web_limit'
}

/**
 * A 200 reply with no sources means retrieval found nothing to ground an answer in,
 * unless it is a general-knowledge or web answer (shown, labelled) or the web-limit reply.
 */
export function isMissingEvidence(result) {
  return result.sources.length === 0 && !isGeneralKnowledge(result) && !isWebAnswer(result) && !isWebLimit(result)
}

/**
 * How many of the returned sources the answer actually cites. `sources` holds every
 * retrieved chunk, cited or not, so its length overstates the grounding; an answer
 * that declines ("the specs don't say") cites none. Counts distinct [n] markers that
 * point at a real source, the same ones AnswerText turns into buttons.
 */
export function citedSourceCount(result) {
  const cited = new Set()
  for (const match of result.answer.matchAll(/\[(\d+)\]/g)) {
    const n = Number(match[1])
    if (n >= 1 && n <= result.sources.length) cited.add(n)
  }
  return cited.size
}

/**
 * An answer that came back with sources but cites none of them (for example after
 * citations.py removed out-of-range markers): nothing in it is backed by a source (#124).
 */
export function hasNoSupportingSource(result) {
  return (
    !isMissingEvidence(result) && !isGeneralKnowledge(result) && !isWebLimit(result) && citedSourceCount(result) === 0
  )
}

/** How many out-of-range [n] markers the backend removed (`invalid_citations_removed`), 0 if absent. */
export function removedCitationCount(result) {
  const n = result?.invalid_citations_removed
  return Number.isInteger(n) && n > 0 ? n : 0
}

const FAILURES = {
  timeout: {
    title: 'The AI Timed Out',
    message: 'The AI took too long to answer, so no answer was produced. Please try again.',
    retry: true,
  },
  unavailable: {
    title: 'AI Answers Are Unavailable',
    message: 'The AI service could not be reached, so no answer was produced. Spec browsing still works.',
    retry: true,
  },
  malformed: {
    title: 'Unusable AI Response',
    message: 'The AI sent back something we could not read, so we are not showing it. Please try again or rephrase.',
    retry: true,
  },
  rateLimited: {
    title: 'Too Many Questions',
    message: 'You have asked a lot of questions in a short time. Wait a minute, then try again.',
    retry: true,
  },
  network: {
    title: 'Connection Problem',
    message: 'Your browser could not reach TekaTech, so no answer was produced. Check your connection and try again.',
    retry: true,
  },
  invalidQuestion: {
    title: 'Question Not Accepted',
    message: 'Try a shorter, more specific question.',
    retry: false,
  },
  unknown: {
    title: 'Something Went Wrong',
    message: 'No answer was produced. Please try again.',
    retry: true,
  },
}

function kindOf(err) {
  if (err instanceof MalformedAnswerError || err instanceof SyntaxError) return 'malformed'
  if (err instanceof TypeError) return 'network' // fetch() rejects with TypeError when offline / blocked
  const message = typeof err?.message === 'string' ? err.message : ''
  if (err?.status === 503) {
    if (message.startsWith(BACKEND_TIMEOUT)) return 'timeout'
    if (message.startsWith(BACKEND_UNUSABLE)) return 'malformed'
    return 'unavailable'
  }
  if (err?.status === 504 || err?.status === 408) return 'timeout'
  if (err?.status === 502) return 'unavailable'
  if (err?.status === 429) return 'rateLimited'
  if (err?.status === 422 || err?.status === 400) return 'invalidQuestion'
  return 'unknown'
}

/**
 * Describes a failed /query for display: { kind, title, message, retry }.
 * For a rejected question the backend's validation sentence is kept when it is short
 * and plain (e.g. the token-limit message); everything else uses fixed copy.
 */
export function describeAiFailure(err) {
  const kind = kindOf(err)
  const failure = { kind, ...FAILURES[kind] }
  if (kind === 'invalidQuestion' && typeof err?.message === 'string' && err.message.length < 200 && !/[<{]/.test(err.message)) {
    failure.message = err.message
  }
  return failure
}
