import { useId } from 'react'
import { CornerDownRight } from 'lucide-react'

/** Suggested follow-up questions after an answer (see utils/followUps.js).
 * Each one is a real button; choosing it asks that question straight away. */
export default function FollowUpQuestions({ questions, onSelect, disabled = false }) {
  const labelId = useId()
  if (!questions?.length || !onSelect) return null
  return (
    <div>
      <p id={labelId} className="text-sm font-semibold text-slate-800 mb-2">
        Suggested Follow-Up Questions
      </p>
      <div className="flex flex-wrap gap-2" role="group" aria-labelledby={labelId}>
        {questions.map((q) => (
          <button
            key={q}
            type="button"
            disabled={disabled}
            onClick={() => onSelect(q)}
            className="inline-flex items-center gap-1.5 text-left text-sm font-medium text-rail-800 bg-rail-50 hover:bg-rail-100 border border-rail-200 rounded-full px-3 py-1.5 transition active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rail-400"
          >
            <CornerDownRight size={13} aria-hidden="true" className="shrink-0" />
            {q}
          </button>
        ))}
      </div>
    </div>
  )
}
