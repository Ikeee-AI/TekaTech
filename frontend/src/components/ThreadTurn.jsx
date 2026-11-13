import { useRef, useState } from 'react'
import { Sparkles } from 'lucide-react'
import AiAnswerResult from './AiAnswerResult'

function formatAskedAt(iso) {
  if (!iso) return null
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return null
  return date.toLocaleString('en-PH', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

/** The user's side of a chat turn: a right-aligned bubble, like ChatGPT/Claude. */
export function UserBubble({ question, askedAt }) {
  const when = formatAskedAt(askedAt)
  return (
    <div className="flex flex-col items-end gap-1">
      <div className="max-w-[85%] rounded-3xl rounded-br-lg bg-rail-100 text-slate-900 px-4 py-2.5">
        <p className="text-[15px] leading-relaxed whitespace-pre-line break-words">{question}</p>
      </div>
      {when && <p className="text-xs text-slate-500 pr-2">{when}</p>}
    </div>
  )
}

/** The assistant's side of a chat turn: small avatar, answer text without a bubble. */
export function AssistantMessage({ children }) {
  return (
    <div className="flex items-start gap-3">
      <span
        className="mt-3 inline-flex items-center justify-center size-7 shrink-0 rounded-full bg-rail-700 text-white"
        aria-hidden="true"
      >
        <Sparkles size={14} />
      </span>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  )
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
    <li className="space-y-3" aria-label={`Question ${index + 1}: ${turn.question}`}>
      <UserBubble question={turn.question} askedAt={turn.askedAt} />
      <AssistantMessage>
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
      </AssistantMessage>
    </li>
  )
}
