import { ChevronDown, ChevronUp, ExternalLink, RefreshCw, Copy, Check } from 'lucide-react'
import AnswerText from './AnswerText'
import Alert from './ui/Alert'
import Button from './ui/Button'
import { describeAiFailure } from '../utils/aiAnswerState'

export function AnswerSkeleton({ lines = 3 }) {
  const widths = ['100%', '92%', '95%', '78%', '70%']
  return (
    <div className="space-y-2.5 py-1 animate-pulse" aria-hidden="true">
      {widths.slice(0, lines).map((w, i) => (
        <div key={i} className="h-4 bg-slate-100 rounded" style={{ width: w }} />
      ))}
    </div>
  )
}

/** Shows why no answer was produced. The copy comes from describeAiFailure(),
 * never from the raw error, so stack traces and provider details stay hidden. */
function FailureNotice({ error, onRetry }) {
  const failure = describeAiFailure(error)
  return (
    <Alert
      tone="error"
      title={failure.title}
      className="mt-3"
      action={
        failure.retry && (
          <Button variant="secondary" size="sm" icon={RefreshCw} onClick={onRetry}>
            Try Again
          </Button>
        )
      }
    >
      {failure.message}
    </Alert>
  )
}

/** Shared loading / error / answer / sources / footer block for both
 * AIAnswerPanel and AIComparisonPanel — the two panels only differ in their
 * header and question-input UI above this. The wrapper is an aria-live region
 * so screen readers hear "searching…", then the answer or the error. */
export default function AiAnswerResult({
  loading,
  error,
  onRetry,
  result,
  sourcesOpen,
  setSourcesOpen,
  highlightedIndex,
  sourceRefs,
  handleCiteClick,
  plainLanguage,
  togglePlainLanguage,
  handleCopy,
  copied,
  skeletonLines = 3,
}) {
  return (
    <div aria-live="polite" aria-busy={loading || undefined}>
      {loading && (
        <div className="mt-3 space-y-3">
          <p className="text-sm font-medium text-slate-600">Searching the spec sheets and writing an answer…</p>
          <AnswerSkeleton lines={skeletonLines} />
        </div>
      )}

      {error && !loading && <FailureNotice error={error} onRetry={onRetry} />}

      {result && !loading && !error && (
        <div className="space-y-4 mt-3">
          {result.sources.length === 0 ? (
            <Alert tone="info" title="No Matching Specs Found">
              {result.answer}
            </Alert>
          ) : (
            <div className="text-[15px] text-slate-800 leading-relaxed">
              <AnswerText text={result.answer} onCiteClick={handleCiteClick} />
            </div>
          )}

          {result.sources.length > 0 && (
            <div>
              <button
                onClick={() => setSourcesOpen((s) => !s)}
                aria-expanded={sourcesOpen}
                aria-controls="answer-sources"
                className="inline-flex items-center gap-1 min-h-9 text-sm font-semibold text-slate-700 hover:text-sage-700 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage-400 rounded"
              >
                {sourcesOpen ? <ChevronUp size={15} aria-hidden="true" /> : <ChevronDown size={15} aria-hidden="true" />}
                {result.sources.length} Source{result.sources.length === 1 ? '' : 's'} Cited
              </button>
              {sourcesOpen && (
                <ol id="answer-sources" className="mt-2 space-y-2 animate-fade-in">
                  {result.sources.map((s, i) => (
                    <li
                      key={i}
                      ref={(el) => (sourceRefs.current[i] = el)}
                      className={`border rounded-lg px-3.5 py-3 transition-colors duration-500 ${
                        highlightedIndex === i ? 'border-sage-400 bg-sage-50' : 'border-slate-200 bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-sage-800 min-w-0">
                          <span className="text-xs bg-white border border-sage-200 rounded px-1.5" aria-label={`Source ${i + 1}`}>
                            {i + 1}
                          </span>
                          <span className="truncate">{s.gadget_name}</span>
                        </span>
                        <span className="text-xs text-slate-600 shrink-0">{Math.round(s.similarity * 100)}% match</span>
                      </div>
                      <div className="h-1 bg-slate-200 rounded-full overflow-hidden mb-2" aria-hidden="true">
                        <div className="h-full bg-sage-600 rounded-full" style={{ width: `${Math.round(s.similarity * 100)}%` }} />
                      </div>
                      <p className="text-sm text-slate-700 break-words">{s.content}</p>
                      {s.source_url && (
                        <a
                          href={s.source_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-sm font-medium text-sage-700 hover:underline mt-1.5 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage-400"
                        >
                          <ExternalLink size={13} aria-hidden="true" /> Source
                          <span className="sr-only">(opens in a new tab)</span>
                        </a>
                      )}
                    </li>
                  ))}
                </ol>
              )}
            </div>
          )}

          <div className="flex items-center justify-between flex-wrap gap-3 pt-3 border-t border-slate-200">
            <label className="flex items-center gap-2 min-h-9 text-sm font-medium text-slate-700 cursor-pointer select-none rounded focus-within:ring-2 focus-within:ring-sage-400 px-1 -mx-1">
              <input
                type="checkbox"
                checked={plainLanguage}
                onChange={(e) => togglePlainLanguage(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 accent-sage-700 focus:outline-none"
              />
              Plain-Language Answer
            </label>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" icon={copied ? Check : Copy} onClick={handleCopy}>
                {copied ? 'Copied' : 'Copy'}
              </Button>
              <Button variant="outline" size="sm" icon={RefreshCw} onClick={onRetry}>
                Regenerate
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
