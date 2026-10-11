import { useEffect, useState } from 'react'
import { Sparkles, AlertTriangle } from 'lucide-react'
import { api } from '../api/client'
import { useAiAnswer } from '../hooks/useAiAnswer'
import AiAnswerResult, { AnswerSkeleton } from './AiAnswerResult'

const DEFAULT_QUESTION = 'Compare these gadgets and highlight the key trade-offs someone should know before buying.'
const SUGGESTED_QUESTIONS = ['Which offers better value for the price?', 'Compare battery life', 'Compare camera quality']

export default function AIComparisonPanel({ gadgetIds, gadgetNames }) {
  const [question, setQuestion] = useState(DEFAULT_QUESTION)
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
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  function handleSuggestedClick(q) {
    setQuestion(q)
    handleAsk(q)
  }

  return (
    <div className="mt-8 bg-white border border-gray-200 rounded-xl p-6">
      <div className="flex items-center gap-2 mb-1">
        <Sparkles size={17} className="text-teal-600" />
        <h2 className="font-display text-base font-semibold text-gray-900">AI trade-off comparison</h2>
      </div>
      <p className="text-sm text-gray-500 mb-3">
        Grounded in the specs added for {gadgetNames.join(', ')} — this only uses real spec data, not general knowledge.
      </p>

      {!checkingSpecs && missingSpecs.length > 0 && (
        <div className="flex items-start gap-2 bg-amber-50 border border-amber-100 rounded-md px-3 py-2.5 text-sm text-amber-800 mb-4">
          <AlertTriangle size={15} className="shrink-0 mt-0.5" />
          <span>
            <strong className="font-medium">{missingSpecs.join(', ')}</strong> {missingSpecs.length === 1 ? 'has' : 'have'} no
            specs added yet — the AI won't be able to say anything grounded about{' '}
            {missingSpecs.length === 1 ? 'it' : 'them'}.
          </span>
        </div>
      )}

      {!result && !loading && (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-1.5">
            {SUGGESTED_QUESTIONS.map((q) => (
              <button
                key={q}
                onClick={() => handleSuggestedClick(q)}
                className="text-xs font-medium text-teal-700 bg-teal-50 hover:bg-teal-100 rounded-full px-2.5 py-1 transition active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400"
              >
                {q}
              </button>
            ))}
          </div>
          <label htmlFor="ai-question" className="sr-only">
            Question to ask
          </label>
          <textarea
            id="ai-question"
            rows={2}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:border-teal-400 focus:ring-1 focus:ring-teal-400 outline-none transition resize-none"
          />
          <div className="flex items-center justify-between flex-wrap gap-3">
            <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={plainLanguage}
                onChange={(e) => togglePlainLanguage(e.target.checked)}
                className="rounded border-gray-300 text-teal-600 focus:ring-teal-400"
              />
              Plain-language answer
            </label>
            <button
              onClick={() => handleAsk()}
              disabled={!question.trim()}
              className="flex items-center gap-1.5 bg-teal-600 text-white text-sm font-medium px-4 py-2 rounded-md hover:bg-teal-700 active:scale-95 disabled:opacity-50 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400"
            >
              <Sparkles size={14} /> Generate comparison
            </button>
          </div>
        </div>
      )}

      {loading && <AnswerSkeleton lines={4} />}

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
      />
    </div>
  )
}
