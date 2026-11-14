import { useEffect, useState } from 'react'
import { TrendingUp } from 'lucide-react'
import { api } from '../api/client'
import { questionDisplayText } from '../utils/gadgetName'

// Popular questions, shown without ask counts (shopper-facing, 14 Nov 2026). The display text
// collapses a doubled brand; the question sent to the AI is the same cleaned text.
export default function TrendingQuestions({ onSelect }) {
  const [trending, setTrending] = useState([])

  useEffect(() => {
    api.getTrendingQuestions().then(setTrending).catch(() => {})
  }, [])

  if (trending.length === 0) return null

  // Two stored questions can read the same once cleaned; show each once.
  const questions = [...new Set(trending.map((t) => questionDisplayText(t.question)))]

  return (
    <div className="mb-4">
      <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1.5">
        <TrendingUp size={12} aria-hidden="true" /> Popular Questions
      </div>
      <div className="flex flex-wrap gap-1.5">
        {questions.map((question) => (
          <button
            key={question}
            type="button"
            onClick={() => onSelect(question)}
            className="text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-full px-2.5 py-1 min-h-11 sm:min-h-8 transition active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage-600"
          >
            {question}
          </button>
        ))}
      </div>
    </div>
  )
}
