import { useEffect, useRef, useState } from 'react'
import { History, MessageSquarePlus, Sparkles, Trash2 } from 'lucide-react'
import { api } from '../api/client'
import { useAiAnswer } from '../hooks/useAiAnswer'
import { useAuth } from '../hooks/useAuth'
import { useGadgetThread } from '../hooks/useGadgetThread'
import { friendlyError } from '../utils/requestErrors'
import { validateAnswerResponse } from '../utils/aiAnswerState'
import { MAX_QUESTION_CHARS } from '../utils/questionLimits'
import { suggestFollowUps } from '../utils/followUps'
import AiAnswerResult, { AnswerOptions } from './AiAnswerResult'
import Button from './ui/Button'
import Alert from './ui/Alert'
import ThreadTurn from './ThreadTurn'

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
  // Per-gadget conversation (user_questions.sql): only for a signed-in user asking about
  // one gadget, which is exactly when POST /query saves the turn on the server.
  const { user } = useAuth() ?? {}
  const thread = useGadgetThread(mode === 'single' ? gadgetIds[0] : null, user?.id)
  const [confirmClear, setConfirmClear] = useState(false)
  // Cheap and deterministic (a short curated list), so it is simply recomputed each render.
  const followUps = suggestFollowUps({ mode, gadgetNames, category, lastQuestion: askedQuestion })
  const specTargets = gadgetIds.map((id, i) => ({ id, name: gadgetNames[i] }))

  async function handleAsk(questionOverride) {
    const q = questionOverride ?? question
    if (loading) return
    archiveAnswer()
    setAskedQuestion(q)
    setLoading(true)
    setError(null)
    try {
      const data = await api.askQuestion({ question: q, gadget_ids: gadgetIds, ...requestOptions })
      // A reply without answer text or a valid source list is a failure, never an answer.
      setResult(validateAnswerResponse(data))
      setSourcesOpen(false)
    } catch (err) {
      setError(err)
    } finally {
      setLoading(false)
    }
  }

  // The answer on screen joins the thread above once the user moves on (a new question,
  // a follow-up chip or "Ask Another Question"); it was saved server-side when returned.
  function archiveAnswer() {
    if (!thread.enabled || !result || error) return
    thread.appendTurn(askedQuestion, result)
    setResult(null)
  }

  async function handleClearThread() {
    setConfirmClear(false)
    await thread.clear()
  }

  // Back to the question box, keeping the last question there to edit.
  function handleAskAnother() {
    archiveAnswer()
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
        {allowGeneralKnowledge ? (
          <>
            Answers use the specs saved for {gadgetNames.join(', ')}, with numbered sources. General knowledge is on: if
            no saved spec matches, the answer comes from general knowledge and is labelled unverified.
          </>
        ) : (
          <>
            Answers use only the specs saved for {gadgetNames.join(', ')}, with numbered sources. If something isn&apos;t
            in the specs, TekaTech says so instead of guessing.
          </>
        )}
      </p>

      {!checkingSpecs && missingSpecs.length > 0 && (
        <Alert tone="warning" className="mb-4">
          <strong className="font-semibold">{missingSpecs.join(', ')}</strong> {missingSpecs.length === 1 ? 'has' : 'have'} no
          indexed specs yet — the AI won&apos;t be able to say anything grounded about {missingSpecs.length === 1 ? 'it' : 'them'}.
          Add specs and index them on the gadget page.
        </Alert>
      )}

      {thread.enabled && (thread.loading || thread.error || thread.turns.length > 0) && (
        <div className="mb-5">
          <div className="flex items-center justify-between gap-2 flex-wrap mb-3">
            <h3 id="gadget-thread-title" className="flex items-center gap-1.5 text-sm font-semibold text-slate-800">
              <History size={15} aria-hidden="true" className="text-slate-500" /> Your Earlier Questions
            </h3>
            {thread.turns.length > 0 &&
              (confirmClear ? (
                <div className="flex items-center gap-2" role="group" aria-label="Confirm clearing your questions">
                  <span className="text-sm text-slate-700">Clear all your questions about this gadget?</span>
                  <Button variant="dangerSolid" size="sm" onClick={handleClearThread} loading={thread.clearing}>
                    Clear
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setConfirmClear(false)} disabled={thread.clearing}>
                    Cancel
                  </Button>
                </div>
              ) : (
                <Button variant="ghost" size="sm" icon={Trash2} onClick={() => setConfirmClear(true)} disabled={loading}>
                  Clear Conversation
                </Button>
              ))}
          </div>
          {thread.loading && (
            <p role="status" className="text-sm text-slate-500">Loading your earlier questions…</p>
          )}
          {thread.error && (
            <Alert tone="warning" className="mb-3">
              {friendlyError(thread.error)}
            </Alert>
          )}
          {thread.turns.length > 0 && (
            <ol aria-labelledby="gadget-thread-title" className="space-y-4">
              {thread.turns.map((turn, i) => (
                <ThreadTurn key={turn.id} turn={turn} index={i} specTargets={specTargets} />
              ))}
            </ol>
          )}
        </div>
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
            <AnswerOptions
              plainLanguage={plainLanguage}
              togglePlainLanguage={togglePlainLanguage}
              allowGeneralKnowledge={allowGeneralKnowledge}
              setAllowGeneralKnowledge={setAllowGeneralKnowledge}
            />
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
        allowGeneralKnowledge={allowGeneralKnowledge}
        setAllowGeneralKnowledge={setAllowGeneralKnowledge}
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
