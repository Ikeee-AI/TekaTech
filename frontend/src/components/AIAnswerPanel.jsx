import { useEffect, useRef, useState } from 'react'
import { Info, Sparkles, X } from 'lucide-react'
import { api } from '../api/client'
import { useAiAnswer } from '../hooks/useAiAnswer'
import { validateAnswerResponse } from '../utils/aiAnswerState'
import { questionTooLongError } from '../utils/questionLimits'
import { suggestFollowUps } from '../utils/followUps'
import AiAnswerResult from './AiAnswerResult'
import AiUsageBadge from './AiUsageBadge'

export default function AIAnswerPanel({ question, onClose }) {
  // A follow-up chosen from the suggestions replaces the searched question (prop) on
  // screen; a new search clears it (state adjusted during render, not in an effect).
  const [followUp, setFollowUp] = useState(null)
  const [searchedQuestion, setSearchedQuestion] = useState(question)
  if (question !== searchedQuestion) {
    setSearchedQuestion(question)
    setFollowUp(null)
  }
  const askedQuestion = followUp ?? question
  // Only the newest request may update the panel, so a slow earlier answer can't
  // overwrite the answer to a question asked after it.
  const latestRequest = useRef(0)
  const {
    plainLanguage,
    togglePlainLanguage,
    allowGeneralKnowledge,
    setAllowGeneralKnowledge,
    requestOptions,
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
    startStream,
    streamText,
    streamSources,
  } = useAiAnswer()

  async function ask(q) {
    const requestId = ++latestRequest.current
    // The question comes from the URL (?ask=), which can be longer than the capped search
    // box, so check it here instead of spending a request the backend would reject.
    const tooLong = questionTooLongError(q)
    if (tooLong) {
      setLoading(false)
      setResult(null)
      setError(tooLong)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const data = await api.askQuestion({ question: q, ...requestOptions, ...startStream() })
      if (requestId !== latestRequest.current) return
      // A reply without answer text or a valid source list is a failure, never an answer.
      setResult(validateAnswerResponse(data))
      setSourcesOpen(false)
    } catch (err) {
      if (requestId !== latestRequest.current) return
      setError(err)
    } finally {
      if (requestId === latestRequest.current) setLoading(false)
    }
  }

  useEffect(() => {
    ask(question)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [question])

  // Not scoped to any gadget here, so the suggestions are general ("Which gadgets…?").
  const followUps = suggestFollowUps({ mode: 'general', lastQuestion: askedQuestion })

  function handleFollowUp(q) {
    if (loading) return
    setFollowUp(q)
    ask(q)
  }

  return (
    <section aria-labelledby="ai-answer-title" className="bg-white border border-sage-300 rounded-xl p-5 sm:p-6 shadow-xs animate-fade-in">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 id="ai-answer-title" className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-sage-700">
            <Sparkles size={14} aria-hidden="true" /> AI Answer
          </h2>
          <p className="text-lg font-semibold text-slate-900 mt-1 break-words">&ldquo;{askedQuestion}&rdquo;</p>
          <AiUsageBadge className="mt-2" />
          <p className="flex items-start gap-1.5 mt-1.5 text-xs text-slate-600">
            <Info size={14} aria-hidden="true" className="shrink-0 mt-px text-slate-500" />
            <span>
              {allowGeneralKnowledge ? (
                <>
                  Answers use the specs saved in TekaTech, with numbered sources. General knowledge is on: if no saved
                  spec matches, the answer comes from general knowledge and is labelled unverified.
                </>
              ) : (
                <>
                  Answers use only the specs saved in TekaTech, with numbered sources. If something isn&apos;t in the
                  specs, TekaTech says so instead of guessing.
                </>
              )}
            </span>
          </p>
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
        streamText={streamText}
        streamSources={streamSources}
        loading={loading}
        error={error}
        onRetry={() => ask(askedQuestion)}
        result={result}
        sourcesOpen={sourcesOpen}
        setSourcesOpen={setSourcesOpen}
        highlightedIndex={highlightedIndex}
        sourceRefs={sourceRefs}
        handleCiteClick={handleCiteClick}
        plainLanguage={plainLanguage}
        togglePlainLanguage={togglePlainLanguage}
        allowGeneralKnowledge={allowGeneralKnowledge}
        setAllowGeneralKnowledge={setAllowGeneralKnowledge}
        handleCopy={handleCopy}
        copied={copied}
        followUps={followUps}
        onFollowUp={handleFollowUp}
      />
    </section>
  )
}
