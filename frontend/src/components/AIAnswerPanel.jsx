import { useEffect } from 'react'
import { Sparkles, X } from 'lucide-react'
import { api } from '../api/client'
import { useAiAnswer } from '../hooks/useAiAnswer'
import { validateAnswerResponse } from '../utils/aiAnswerState'
import { questionTooLongError } from '../utils/questionLimits'
import AiAnswerResult from './AiAnswerResult'

export default function AIAnswerPanel({ question, onClose }) {
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

  async function ask() {
    // The question comes from the URL (?ask=), which can be longer than the capped search
    // box, so check it here instead of spending a request the backend would reject.
    const tooLong = questionTooLongError(question)
    if (tooLong) {
      setResult(null)
      setError(tooLong)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const data = await api.askQuestion({ question, plain_language: plainLanguage })
      // A reply without answer text or a valid source list is a failure, never an answer.
      setResult(validateAnswerResponse(data))
      setSourcesOpen(false)
    } catch (err) {
      setError(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    ask()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [question])

  return (
    <section aria-labelledby="ai-answer-title" className="bg-white border border-sage-300 rounded-xl p-5 sm:p-6 shadow-xs animate-fade-in">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 id="ai-answer-title" className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-sage-700">
            <Sparkles size={14} aria-hidden="true" /> AI Answer
          </h2>
          <p className="text-lg font-semibold text-slate-900 mt-1 break-words">&ldquo;{question}&rdquo;</p>
        </div>
        <button
          onClick={onClose}
          aria-label="Close AI answer"
          className="p-2 -m-1 text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition shrink-0 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage-400"
        >
          <X size={18} aria-hidden="true" />
        </button>
      </div>

      <AiAnswerResult
        loading={loading}
        error={error}
        onRetry={ask}
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
    </section>
  )
}
