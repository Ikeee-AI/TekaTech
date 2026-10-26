// Longest question POST /query accepts. Must match MAX_QUESTION_CHARS in
// backend/routers/query.py, which rejects anything longer with a 422.
export const MAX_QUESTION_CHARS = 150

/**
 * The error a too-long question would get from the backend, or null if it fits.
 * Counts characters the way the backend does (code points), so an emoji counts once.
 * Used where the question arrives from a link (?ask=) rather than a capped input.
 */
export function questionTooLongError(question) {
  const chars = [...question].length
  if (chars <= MAX_QUESTION_CHARS) return null
  const err = new Error(`Question is too long: ${chars} characters; the limit is ${MAX_QUESTION_CHARS}.`)
  err.status = 422
  return err
}
