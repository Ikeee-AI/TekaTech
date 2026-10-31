import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ChevronDown, ChevronUp, ExternalLink, RefreshCw, Copy, Check, CheckCircle2, FileText, LogIn, Zap } from 'lucide-react'
import AnswerText from './AnswerText'
import FollowUpQuestions from './FollowUpQuestions'
import { useAuth } from '../hooks/useAuth'
import Alert from './ui/Alert'
import Button from './ui/Button'
import { citedSourceCount, describeAiFailure, hasNoSupportingSource, isMissingEvidence, removedCitationCount } from '../utils/aiAnswerState'

/** "Source: example.com" for a spec sheet link, or plain "Source" if the URL is odd. */
function sourceLabel(url) {
  try {
    return `Source: ${new URL(url).hostname.replace(/^www\./, '')}`
  } catch {
    return 'Source'
  }
}

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

const SLOW_ANSWER_MS = 10_000

/** Loading state. Mounted only while a request runs, so the "still working" note
 * resets on every new question. The backend allows 45 s per AI call
 * (PROVIDER_TIMEOUT_SECONDS, with one retry) and a cold start adds about 42–55 s,
 * so the note promises no fixed time. */
function LoadingNotice({ skeletonLines }) {
  const [slow, setSlow] = useState(false)
  useEffect(() => {
    const timer = setTimeout(() => setSlow(true), SLOW_ANSWER_MS)
    return () => clearTimeout(timer)
  }, [])
  return (
    <div className="mt-3 space-y-3">
      <p className="text-sm font-medium text-slate-600">
        {slow
          ? 'Still working — some answers take a minute or more…'
          : 'Searching the spec sheets and writing an answer…'}
      </p>
      <AnswerSkeleton lines={skeletonLines} />
    </div>
  )
}

/** An answer that cites none of its sources: say plainly that nothing in it is backed by a
 * saved spec. Wording proposed on #124 for Adrian to confirm, since it affects how
 * evaluation abstentions read. */
function NoSupportingSourceNotice({ removed }) {
  return (
    <Alert tone="warning" title="No supporting source cited">
      <p>Nothing in this answer is backed by a saved spec, so treat it as unverified.</p>
      {removed > 0 && <p className="mt-1.5">References to sources that weren&apos;t provided were removed.</p>}
    </Alert>
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

const linkClass =
  'inline-flex items-center gap-1 font-semibold text-amber-900 underline underline-offset-2 hover:text-amber-950 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage-400'

function scrollToSpecs() {
  const heading = document.getElementById('specs-title')
  if (!heading) return
  const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  heading.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' })
}

/** The No-Evidence state, with a next step: rephrase, or add specs to the gadgets in
 * scope (specTargets: [{ id, name }]). On that gadget's own page the link scrolls to its
 * Specifications section instead of reloading the page. */
function NoEvidenceNotice({ specTargets }) {
  const { user } = useAuth() ?? {}
  const { pathname } = useLocation()
  const targets = specTargets ?? []
  return (
    <Alert tone="warning" title="No Evidence Found">
      <p>TekaTech has no saved specs that answer this, so there is no grounded answer to show.</p>
      <p className="mt-1.5">
        Tip: rephrase using a spec term, like &ldquo;battery capacity&rdquo; or &ldquo;screen size&rdquo;.
      </p>
      {targets.length === 0 ? (
        <p className="mt-1.5">Or add specs to the gadget you are asking about, from its page.</p>
      ) : user ? (
        <ul className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1">
          {targets.map((t) =>
            pathname === `/gadgets/${t.id}` ? (
              <li key={t.id}>
                <button type="button" onClick={scrollToSpecs} className={linkClass}>
                  <FileText size={14} aria-hidden="true" /> Add or index specs for {t.name}
                </button>
              </li>
            ) : (
              <li key={t.id}>
                <Link to={`/gadgets/${t.id}`} className={linkClass}>
                  <FileText size={14} aria-hidden="true" /> Add or index specs for {t.name}
                </Link>
              </li>
            ),
          )}
        </ul>
      ) : (
        <p className="mt-1.5">
          <Link to="/login" className={linkClass}>
            <LogIn size={14} aria-hidden="true" /> Log in to add specs
          </Link>
        </p>
      )}
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
  followUps = [],
  onFollowUp,
  specTargets,
}) {
  const missingEvidence = result ? isMissingEvidence(result) : false
  // Only cited sources count as grounding: with none cited there is no green check, and the
  // "no supporting source cited" notice says so instead (#124).
  const citedCount = result && !missingEvidence ? citedSourceCount(result) : 0
  return (
    <div aria-live="polite" aria-busy={loading || undefined}>
      {loading && <LoadingNotice skeletonLines={skeletonLines} />}

      {error && !loading && <FailureNotice error={error} onRetry={onRetry} />}

      {result && !loading && !error && (
        <div className="space-y-4 mt-3">
          {missingEvidence ? (
            <NoEvidenceNotice specTargets={specTargets} />
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-2">
                {citedCount > 0 && (
                  <p className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-full px-2.5 py-1">
                    <CheckCircle2 size={14} aria-hidden="true" />
                    Answer based on {citedCount} cited spec{citedCount === 1 ? '' : 's'}
                  </p>
                )}
                {result.cached === true && (
                  <p className="inline-flex items-center gap-1 text-xs font-medium text-slate-600">
                    <Zap size={12} aria-hidden="true" />
                    Instant answer (saved)
                  </p>
                )}
              </div>
              {hasNoSupportingSource(result) && <NoSupportingSourceNotice removed={removedCitationCount(result)} />}
              <div className="text-[15px] text-slate-800 leading-relaxed">
                <AnswerText text={result.answer} sources={result.sources} onCiteClick={handleCiteClick} />
              </div>
            </>
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
                {result.sources.length} Source{result.sources.length === 1 ? '' : 's'} Retrieved
              </button>
              {sourcesOpen && (
                <ol id="answer-sources" className="mt-2 space-y-2 animate-fade-in">
                  {result.sources.map((s, i) => (
                    <li
                      key={i}
                      ref={(el) => (sourceRefs.current[i] = el)}
                      tabIndex={-1}
                      aria-label={`Source ${i + 1}: ${s.gadget_name}`}
                      className={`border rounded-lg px-4 py-3.5 transition-colors duration-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-sage-600 ${
                        highlightedIndex === i ? 'border-sage-400 bg-sage-50' : 'border-slate-200 bg-slate-50'
                      }`}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1 mb-2">
                        <span className="flex items-start gap-2 min-w-0 text-[15px] font-semibold text-slate-900">
                          <span
                            className="inline-flex items-center justify-center min-w-6 h-6 px-1.5 text-xs font-bold text-sage-900 bg-sage-100 border border-sage-300 rounded-md shrink-0"
                            aria-hidden="true"
                          >
                            {i + 1}
                          </span>
                          <span className="break-words pt-0.5">{s.gadget_name}</span>
                        </span>
                        {typeof s.similarity === 'number' && (
                          <span className="text-xs font-medium text-slate-600 shrink-0 pt-1">
                            Relevance {Math.round(s.similarity * 100)}%
                          </span>
                        )}
                      </div>
                      {typeof s.similarity === 'number' && (
                        <div className="h-1 bg-slate-200 rounded-full overflow-hidden mb-2.5" aria-hidden="true">
                          <div className="h-full bg-sage-600 rounded-full" style={{ width: `${Math.round(s.similarity * 100)}%` }} />
                        </div>
                      )}
                      <p className="text-[15px] text-slate-800 leading-relaxed whitespace-pre-line break-words">{s.content}</p>
                      {s.source_url && (
                        <a
                          href={s.source_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-sm font-medium text-sage-700 hover:underline mt-2 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage-400 break-all"
                        >
                          <ExternalLink size={13} aria-hidden="true" className="shrink-0" /> {sourceLabel(s.source_url)}
                          <span className="sr-only">(opens in a new tab)</span>
                        </a>
                      )}
                    </li>
                  ))}
                </ol>
              )}
            </div>
          )}

          <FollowUpQuestions questions={followUps} onSelect={onFollowUp} disabled={loading} />

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
              {!missingEvidence && (
                <Button variant="secondary" size="sm" icon={copied ? Check : Copy} onClick={handleCopy}>
                  {copied ? 'Copied' : 'Copy'}
                </Button>
              )}
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
