import { useEffect, useState } from 'react'
import { api } from '../api/client'
import { questionDisplayText } from '../utils/gadgetName'
import QuestionChip from './QuestionChip'

// Popular questions, shown without ask counts (shopper-facing, 14 Nov 2026). The display text
// collapses a doubled brand; the question sent to the AI is the same cleaned text.
// Renders bare chips (22 Nov 2026): the catalog puts them in one row with its suggested
// questions, so `exclude` drops a popular question that is already a suggestion.
export default function TrendingQuestions({ onSelect, exclude = [] }) {
  const [trending, setTrending] = useState([])

  useEffect(() => {
    api.getTrendingQuestions().then(setTrending).catch(() => {})
  }, [])

  // Two stored questions can read the same once cleaned; show each once.
  const skip = new Set(exclude.map((q) => q.toLowerCase()))
  const questions = [...new Set(trending.map((t) => questionDisplayText(t.question)))].filter(
    (q) => !skip.has(q.toLowerCase()),
  )
  if (questions.length === 0) return null

  return questions.map((question) => <QuestionChip key={question} question={question} onSelect={onSelect} />)
}
