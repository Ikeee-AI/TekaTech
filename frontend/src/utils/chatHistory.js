import { MAX_QUESTION_CHARS } from './questionLimits'

// The backend's MAX_HISTORY_TURNS (routers/query.py): more is a 422.
export const HISTORY_TURNS = 3

// Earlier chat turns for POST /query `history`: oldest first, answered turns only, the newest
// HISTORY_TURNS. The backend strips the old [n] markers and cuts long answers itself.
export function historyForRequest(turns) {
  return turns
    .filter((t) => t.question && t.result?.answer)
    .slice(-HISTORY_TURNS)
    .map((t) => ({ question: t.question.slice(0, MAX_QUESTION_CHARS), answer: t.result.answer }))
}
