import { useEffect, useState } from 'react'
import { TrendingUp } from 'lucide-react'
import { api } from '../api/client'

export default function TrendingQuestions({ onSelect }) {
  const [trending, setTrending] = useState([])

  useEffect(() => {
    api.getTrendingQuestions().then(setTrending).catch(() => {})
  }, [])

  if (trending.length === 0) return null

  return (
    <div className="mb-4">
      <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1.5">
        <TrendingUp size={12} /> Popular Questions
      </div>
      <div className="flex flex-wrap gap-1.5">
        {trending.map((t) => (
          <button
            key={t.question}
            onClick={() => onSelect(t.question)}
            className="text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-full px-2.5 py-1 transition active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage-600"
          >
            {t.question}
            {t.count > 1 && <span className="text-gray-500 ml-1">×{t.count}</span>}
          </button>
        ))}
      </div>
    </div>
  )
}