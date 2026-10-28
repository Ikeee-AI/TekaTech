import { useEffect, useRef, useState } from 'react'
import { MessageSquarePlus, Sparkles } from 'lucide-react'
import { api } from '../api/client'
import { useAiAnswer } from '../hooks/useAiAnswer'
import { validateAnswerResponse } from '../utils/aiAnswerState'
import { MAX_QUESTION_CHARS } from '../utils/questionLimits'
import { suggestFollowUps } from '../utils/followUps'
import AiAnswerResult from './AiAnswerResult'
import Button from './ui/Button'
import Alert from './ui/Alert'

const DEFAULT_QUESTION = 'Compare these gadgets and highlight the key trade-offs someone should know before buying.'
const SUGGESTED_QUESTIONS = ['Which offers better value for the price?', 'Compare battery life', 'Compare camera quality']

export default function AIComparisonPanel({
  gadgetIds,
  gadgetNames,
  title = 'AI Trade-Off Comparison',
  defaultQuestion = DEFAULT_QUESTION,
  suggestions = SUGGESTED_QUESTIONS,
  buttonLabel = 'Generate Comparison',
  // Optional: the gadget's category text, or one per gadget for a comparison. Picks the
  // follow-up topics (camera for phones, ports for laptops…); without it they are generic.
  category,
}) {
  const [question, setQuestion] = useState(defaultQuestion)
  // The question behind the answer on screen; the box can be edited without changing it.
  const [askedQuestion, setAskedQuestion] = useState('')
  const [missingSpecs, setMissingSpecs] = useState([])
  const [checkingSpecs, setCheckingSpecs] = useState(true)
  const questionRef = useRef(null)
  const {
    plainLanguage,
    togglePlainLanguage,
    loading,
    setLoading,
    error,
    setError,
    result,
    setResult,
    sourcesOpen,
    setSourcesOpen,
    copied,
    highlightedIndex,
    sourceRefs,
    handleCiteClick,
    handleCopy,
    resetAnswer,
  } = useAiAnswer()

  useEffect(() => {
    // Standard fetch-on-mount/on-id-change pattern used throughout this app —
    // the strict set-state-in-effect rule flags this, but it's a correct,
    // ordinary data fetch (loading toggled around a real async call).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCheckingSpecs(true)
    Promise.all(
      gadgetIds.map((id, i) =>
        api
          .getSpecs(id)
          // Only indexed specs reach the AI; pending ones have no embedding yet.
          .then((specs) => ({ name: gadgetNames[i], count: specs.filter((s) => s.indexing_status === 'indexed').length }))
          .catch(() => ({ name: gadgetNames[i], count: 0 }))
      )
    )
      .then((results) => setMissingSpecs(results.filter((r) => r.count === 0).map((r) => r.name)))
      .finally(() => setCheckingSpecs(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gadgetIds.join(',')])

  const mode = gadgetIds.length > 1 ? 'comparison' : 'single'
  // Cheap and deterministic (a short curated list), so it is simply recomputed each render.
  const followUps = suggestFollowUps({ mode, gadgetNames, category, lastQuestion: askedQuestion })
  const specTargets = gadgetIds.map((id, i) => ({ id, name: gadgetNames[i] }))

  async function handleAsk(questionOverride) {
    const q = questionOverride ?? question
    if (loading) return
    setAskedQuestion(q)
    setLoading(true)
    setError(null)
    try {
      const data = await api.askQuestion({ question: q, gadget_ids: gadgetIds, plain_language: plainLanguage })
      // A reply without answer text or a valid source list is a failure, never an answer.
      setResult(validateAnswerResponse(data))
      setSourcesOpen(false)
    } catch (err) {
      setError(err)
    } finally {
      setLoading(false)
    }
  }

  // Back to the question box, keeping the last question there to edit.
  function handleAskAnother() {
    resetAnswer()
    requestAnimationFrame(() => questionRef.current?.focus())
  }

  function handleSuggestedClick(q) {
    setQuestion(q)
    handleAsk(q)
  }

  // A follow-up chip asks right away; the question box keeps it for "Ask Another Question".
  function handleFollowUp(q) {
    if (loading || [...q].length > MAX_QUESTION_CHARS) return
    setQuestion(q)
    handleAsk(q)
  }

  return (
    <section aria-labelledby="ai-compare-title" className="mt-8 bg-white border border-slate-200 rounded-xl p-5 sm:p-6 shadow-xs">
      <div className="flex items-center gap-2 mb-1">
        <Sparkles size={18} className="text-sage-700" aria-hidden="true" />
        <h2 id="ai-compare-title" className="text-lg font-bold text-slate-900">{title}</h2>
      </div>
      <p className="text-sm text-slate-600 mb-4">
        Answers use only the specs saved for {gadgetNames.join(', ')}, with numbered sources. If something isn&apos;t in
        the specs, TekaTech says so instead of guessing.
      </p>

      {!checkingSpecs && missingSpecs.length > 0 && (
        <Alert tone="warning" className="mb-4">
          <strong className="font-semibold">{missingSpecs.join(', ')}</strong> {missingSpecs.length === 1 ? 'has' : 'have'} no
          indexed specs yet — the AI won&apos;t be able to say anything grounded about {missingSpecs.length === 1 ? 'it' : 'them'}.
          Add specs and index them on the gadget page.
        </Alert>
      )}

      {!result && !loading && (
        <div className="space-y-4">
          <div>
            <p className="text-sm font-semibold text-slate-800 mb-2" id="suggested-questions-label">
              Suggested Questions
            </p>
            <div className="flex flex-wrap gap-2" role="group" aria-labelledby="suggested-questions-label">
              {suggestions.map((q) => (
                <button
                  key={q}
                  onClick={() => handleSuggestedClick(q)}
                  className="text-sm font-medium text-sage-800 bg-sage-50 hover:bg-sage-100 border border-sage-200 rounded-full px-3 py-1.5 min-h-10 sm:min-h-8 transition active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage-400"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label htmlFor="ai-question" className="block text-sm font-semibold text-slate-800 mb-1.5">
              Question to Ask
            </label>
            <textarea
              id="ai-question"
              ref={questionRef}
              rows={2}
              value={question}
              maxLength={MAX_QUESTION_CHARS}
              aria-describedby="ai-question-count"
              onChange={(e) => setQuestion(e.target.value)}
              className="w-full bg-white text-slate-900 border border-slate-300 hover:border-slate-400 rounded-lg px-3 py-2.5 text-[15px] focus:border-sage-600 focus:ring-2 focus:ring-sage-200 outline-none transition resize-y"
            />
            <p id="ai-question-count" className="mt-1 text-right text-xs text-slate-500 tabular-nums">
              {question.length}/{MAX_QUESTION_CHARS}
            </p>
          </div>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <label className="flex items-center gap-2 min-h-9 text-sm font-medium text-slate-700 cursor-pointer select-none rounded focus-within:ring-2 focus-within:ring-sage-400 px-1 -mx-1">
              <input
                type="checkbox"
                checked={plainLanguage}
                onChange={(e) => togglePlainLanguage(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 accent-sage-700 focus:outline-none"
              />
              Plain-Language Answer
            </label>
            <Button variant="primary" icon={Sparkles} onClick={() => handleAsk()} disabled={!question.trim()}>
              {buttonLabel}
            </Button>
          </div>
        </div>
      )}

      <AiAnswerResult
        loading={loading}
        error={error}
        onRetry={() => handleAsk()}
        result={result}
        sourcesOpen={sourcesOpen}
        setSourcesOpen={setSourcesOpen}
        highlightedIndex={highlightedIndex}
        sourceRefs={sourceRefs}
        handleCiteClick={handleCiteClick}
        plainLanguage={plainLanguage}
        togglePlainLanguage={togglePlainLanguage}
        handleCopy={handleCopy}
        copied={copied}
        skeletonLines={4}
        followUps={followUps}
        onFollowUp={handleFollowUp}
        specTargets={specTargets}
      />

      {result && !loading && (
        <div className="mt-4 flex justify-end">
          <Button variant="outline" size="sm" icon={MessageSquarePlus} onClick={handleAskAnother}>
            Ask Another Question
          </Button>
        </div>
      )}
    </section>
  )
}
