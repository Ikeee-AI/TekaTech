import { Sparkles } from 'lucide-react'

// One chip style for every question the catalog offers to ask (owner, 22 Nov 2026): popular
// questions and suggested questions used to look different; both use the sparkle chip now.
export default function QuestionChip({ question, onSelect }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(question)}
      className="flex shrink-0 items-center gap-1.5 text-sm font-semibold text-slate-800 bg-white hover:bg-slate-100 border border-slate-200 rounded-full px-3.5 py-1.5 min-h-11 sm:min-h-9 whitespace-nowrap transition active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage-600"
    >
      <Sparkles size={13} className="text-sage-700" aria-hidden="true" /> {question}
    </button>
  )
}
