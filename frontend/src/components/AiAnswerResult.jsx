import { ChevronDown, ChevronUp, ExternalLink, RefreshCw, AlertCircle, Copy, Check, Sparkles } from 'lucide-react'
import AnswerText from './AnswerText'

export function AnswerSkeleton({ lines = 3 }) {
  const widths = ['100%', '92%', '95%', '78%', '70%']
  return (
    <div className="space-y-2 py-1 animate-pulse">
      {widths.slice(0, lines).map((w, i) => (
        <div key={i} className="h-3.5 bg-gray-100 rounded" style={{ width: w }} />
      ))}
    </div>
  )
}

/** Shared error / answer / sources / footer block for both AIAnswerPanel
 * and AIComparisonPanel — the two panels only differ in their header and
 * question-input UI above this. */
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
}) {
  return (
    <>
      {error && (
        <div className="mt-2 space-y-2">
          <div className="flex items-start gap-2 bg-red-50 border border-red-100 rounded-md px-3 py-2.5 text-sm text-red-700">
            <AlertCircle size={15} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
          <button
            onClick={onRetry}
            className="flex items-center gap-1.5 text-xs font-medium text-gray-600 border border-gray-200 rounded-md px-3 py-1.5 hover:bg-gray-50 active:scale-95 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400"
          >
            <RefreshCw size={12} /> Try again
          </button>
        </div>
      )}

      {result && !loading && (
        <div className="space-y-3 mt-2">
          {result.sources.length === 0 ? (
            <div className="flex items-start gap-2 bg-gray-50 border border-gray-200 border-dashed rounded-md px-3 py-3 text-sm text-gray-500">
              <Sparkles size={15} className="shrink-0 mt-0.5 text-gray-300" />
              <span>{result.answer}</span>
            </div>
          ) : (
            <AnswerText text={result.answer} onCiteClick={handleCiteClick} />
          )}

          {result.sources.length > 0 && (
            <div>
              <button
                onClick={() => setSourcesOpen((s) => !s)}
                aria-expanded={sourcesOpen}
                className="flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-teal-600 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 rounded"
              >
                {sourcesOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                {result.sources.length} source{result.sources.length === 1 ? '' : 's'} cited
              </button>
              {sourcesOpen && (
                <div className="mt-2 space-y-2 animate-fade-in">
                  {result.sources.map((s, i) => (
                    <div
                      key={i}
                      ref={(el) => (sourceRefs.current[i] = el)}
                      className={`bg-gray-50 border rounded-md px-3 py-2 transition-colors duration-500 ${
                        highlightedIndex === i ? 'border-teal-400 bg-teal-50' : 'border-gray-100'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-teal-700">
                          <span className="font-mono text-[10px] bg-white border border-teal-200 rounded px-1">{i + 1}</span>
                          {s.gadget_name}
                        </span>
                        <span className="text-[10px] font-mono text-gray-400">{Math.round(s.similarity * 100)}% match</span>
                      </div>
                      <div className="h-1 bg-gray-200 rounded-full overflow-hidden mb-1.5">
                        <div className="h-full bg-teal-500 rounded-full" style={{ width: `${Math.round(s.similarity * 100)}%` }} />
                      </div>
                      <p className="text-xs text-gray-600">{s.content}</p>
                      {s.source_url && (
                        <a
                          href={s.source_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-teal-600 hover:underline mt-1"
                        >
                          <ExternalLink size={10} /> Source
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="flex items-center justify-between flex-wrap gap-3 pt-2 border-t border-gray-100">
            <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={plainLanguage}
                onChange={(e) => togglePlainLanguage(e.target.checked)}
                className="rounded border-gray-300 text-teal-600 focus:ring-teal-400"
              />
              Plain-language answer
            </label>
            <div className="flex gap-2">
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 text-xs font-medium text-gray-600 border border-gray-200 rounded-md px-3 py-1.5 hover:bg-gray-50 active:scale-95 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400"
              >
                {copied ? <Check size={12} /> : <Copy size={12} />} {copied ? 'Copied' : 'Copy'}
              </button>
              <button
                onClick={onRetry}
                className="flex items-center gap-1.5 text-xs font-medium text-teal-600 border border-teal-200 rounded-md px-3 py-1.5 hover:bg-teal-50 active:scale-95 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400"
              >
                <RefreshCw size={12} /> Regenerate
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
