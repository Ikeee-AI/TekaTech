import { useRef, useState } from 'react'
import { UserRound } from 'lucide-react'
import AiAnswerResult from './AiAnswerResult'

function formatAskedAt(iso) {
  if (!iso) return null
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return null
  return date.toLocaleString('en-PH', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

/**
 * One earlier question and answer in a gadget's AI conversation. The stored answer is
 * rendered by the same AiAnswerResult as a live one (compact mode), so citations,
 * the "cited specs" badge, no-evidence and general-knowledge labels look identical.
 * Each turn keeps its own source-list state, so its [n] markers open its own sources.
 */
export default function ThreadTurn({ turn, index, specTargets }) {
  const [sourcesOpen, setSourcesOpen] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(null)
  const sourceRefs = useRef([])
  const askedAt = formatAskedAt(turn.askedAt)

  function handleCiteClick(i) {
    setSourcesOpen(true)
    setHighlightedIndex(i)
    setTimeout(() => {
      const el = sourceRefs.current[i]
      if (!el) return
      const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
      el.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'nearest' })
      el.focus({ preventScroll: true })
    }, 50)
    setTimeout(() => setHighlightedIndex(null), 1800)
  }

  return (
    <li className="space-y-2" aria-label={`Earlier question ${index + 1}: ${turn.question}`}>
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-br-md bg-sage-700 text-white px-4 py-2.5 shadow-xs">
          <p className="flex items-center gap-1.5 text-xs font-medium text-sage-100 mb-0.5">
            <UserRound size={12} aria-hidden="true" /> You{askedAt && <span aria-hidden="true">· {askedAt}</span>}
          </p>
          <p className="text-[15px] leading-snug break-words">{turn.question}</p>
        </div>
      </div>
      <div className="rounded-2xl rounded-bl-md border border-slate-200 bg-slate-50 px-4 pb-3 pt-1">
        <AiAnswerResult
          compact
          idPrefix={`turn-${index}`}
          loading={false}
          error={null}
          result={turn.result}
          sourcesOpen={sourcesOpen}
          setSourcesOpen={setSourcesOpen}
          highlightedIndex={highlightedIndex}
          sourceRefs={sourceRefs}
          handleCiteClick={handleCiteClick}
          specTargets={specTargets}
        />
      </div>
    </li>
  )
}
