import { useEffect, useState } from 'react'
import { Sparkles } from 'lucide-react'
import { api } from '../api/client'
import { useAiAnswer } from '../hooks/useAiAnswer'
import AiAnswerResult from './AiAnswerResult'
import Button from './ui/Button'
import Alert from './ui/Alert'
import { friendlyError } from '../utils/requestErrors'

const DEFAULT_QUESTION = 'Compare these gadgets and highlight the key trade-offs someone should know before buying.'
const SUGGESTED_QUESTIONS = ['Which offers better value for the price?', 'Compare battery life', 'Compare camera quality']

export default function AIComparisonPanel({
  gadgetIds,
  gadgetNames,
  title = 'AI Trade-Off Comparison',
  defaultQuestion = DEFAULT_QUESTION,
  suggestions = SUGGESTED_QUESTIONS,
  buttonLabel = 'Generate Comparison',
}) {
  const [question, setQuestion] = useState(defaultQuestion)
  const [missingSpecs, setMissingSpecs] = useState([])
  const [checkingSpecs, setCheckingSpecs] = useState(true)
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
          .then((specs) => ({ name: gadgetNames[i], count: specs.length }))
          .catch(() => ({ name: gadgetNames[i], count: 0 }))
      )
    )
      .then((results) => setMissingSpecs(results.filter((r) => r.count === 0).map((r) => r.name)))
      .finally(() => setCheckingSpecs(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gadgetIds.join(',')])

  async function handleAsk(questionOverride) {
    const q = questionOverride ?? question
    setLoading(true)
    setError(null)
    try {
      const data = await api.askQuestion({ question: q, gadget_ids: gadgetIds, plain_language: plainLanguage })
      setResult(data)
      setSourcesOpen(false)
    } catch (err) {
      setError(friendlyError(err))
    } finally {
      setLoading(false)
    }
  }

  function handleSuggestedClick(q) {
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
        Grounded in the specs added for {gadgetNames.join(', ')} — this only uses real spec data, not general knowledge.
      </p>

      {!checkingSpecs && missingSpecs.length > 0 && (
        <Alert tone="warning" className="mb-4">
          <strong className="font-semibold">{missingSpecs.join(', ')}</strong> {missingSpecs.length === 1 ? 'has' : 'have'} no
          specs added yet — the AI won&apos;t be able to say anything grounded about {missingSpecs.length === 1 ? 'it' : 'them'}.
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
                  className="text-sm font-medium text-sage-800 bg-sage-50 hover:bg-sage-100 border border-sage-200 rounded-full px-3 py-1.5 transition active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage-400"
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
              rows={2}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              className="w-full bg-white text-slate-900 border border-slate-300 hover:border-slate-400 rounded-lg px-3 py-2.5 text-[15px] focus:border-sage-600 focus:ring-2 focus:ring-sage-200 outline-none transition resize-y"
            />
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
      />
    </section>
  )
}
