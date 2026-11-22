import { useEffect, useRef, useState } from 'react'
import { MessageSquarePlus, Sparkles, SquarePen } from 'lucide-react'
import { api } from '../api/client'
import { useAiAnswer } from '../hooks/useAiAnswer'
import { validateAnswerResponse } from '../utils/aiAnswerState'
import { MAX_QUESTION_CHARS } from '../utils/questionLimits'
import { suggestFollowUps } from '../utils/followUps'
import { historyForRequest } from '../utils/chatHistory'
import { friendlyError } from '../utils/requestErrors'
import { useComparisonThread } from '../hooks/useGadgetThread'
import ThreadTurn, { AssistantMessage, UserBubble } from './ThreadTurn'
import AiAnswerResult, { AnswerOptions } from './AiAnswerResult'
import Button from './ui/Button'
import Alert from './ui/Alert'
import AiUsageBadge from './AiUsageBadge'
import { useAuth } from '../hooks/useAuth'

const DEFAULT_QUESTION = 'Compare these gadgets and highlight the key trade-offs someone should know before buying.'
const SUGGESTED_QUESTIONS = ['Which offers better value for the price?', 'Compare battery life', 'Compare camera quality']

export default function AIComparisonPanel({
  gadgetIds,
  gadgetNames,
  title = 'AI Trade-Off Comparison',
  className = '',
  defaultQuestion = DEFAULT_QUESTION,
  suggestions = SUGGESTED_QUESTIONS,
  buttonLabel = 'Generate Comparison',
  // Optional: the gadget's category text, or one per gadget for a comparison. Picks the
  // follow-up topics (camera for phones, ports for laptops…); without it they are generic.
  category,
}) {
  const { user } = useAuth() ?? {}
  const isAdmin = Boolean(user?.app_metadata?.is_admin)
  const [question, setQuestion] = useState(defaultQuestion)
  // The question behind the answer on screen; the box can be edited without changing it.
  const [askedQuestion, setAskedQuestion] = useState('')
  const [missingSpecs, setMissingSpecs] = useState([])
  const [checkingSpecs, setCheckingSpecs] = useState(true)
  // Chat memory (22 Nov 2026): the answered questions of this comparison, oldest first. The last
  // few go with each new question (POST /query `history`), so "which one is lighter?" after a
  // battery question keeps the same phones and topic. Since 23 Nov a signed-in user's turns are
  // saved (user_comparison_questions.sql) and reloaded for the same phones in any order; signed
  // out they last for this page view. New Chat clears them; other phones are another thread.
  const thread = useComparisonThread(gadgetIds, user?.id)
  const turns = thread.turns
  const [confirmClear, setConfirmClear] = useState(false)
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
    startStream,
    streamText,
    streamSources,
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
  // The answer on screen is the newest turn; the thread above shows the ones before it.
  const earlierTurns = result && !loading && !error ? turns.slice(0, -1) : turns

  async function handleAsk(questionOverride) {
    const q = questionOverride ?? question
    if (loading) return
    setAskedQuestion(q)
    setLoading(true)
    setError(null)
    try {
      const history = historyForRequest(turns)
      const data = await api.askQuestion({
        question: q,
        gadget_ids: gadgetIds,
        ...requestOptions,
        ...(history.length ? { history } : {}),
        ...startStream(),
      })
      // A reply without answer text or a valid source list is a failure, never an answer.
      const answer = validateAnswerResponse(data)
      setResult(answer)
      setSourcesOpen(false)
      thread.appendTurn(q, answer)
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

  // Forget the conversation (on the server too, when saved): the next question is asked on its own.
  async function handleNewChat() {
    if (!(await thread.clear())) return
    setConfirmClear(false)
    resetAnswer()
    setQuestion(defaultQuestion)
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
    <section aria-labelledby="ai-compare-title" className={`min-w-0 bg-white border border-slate-200 rounded-[28px] p-5 sm:p-6 ${className}`}>
      <div className="flex items-center gap-2 mb-1">
        <Sparkles size={18} className="text-sage-700" aria-hidden="true" />
        <h2 id="ai-compare-title" className="text-lg font-bold text-slate-900">{title}</h2>
      </div>
      <AiUsageBadge className="mb-2" />
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

      {thread.error && (
        <Alert tone="warning" className="mb-4">
          {friendlyError(thread.error)}
        </Alert>
      )}

      {earlierTurns.length > 0 && (
        <ol className="space-y-6 mb-4" aria-label="Earlier questions about these phones">
          {earlierTurns.map((turn, i) => (
            <ThreadTurn key={turn.id} turn={turn} index={i} specTargets={specTargets} />
          ))}
        </ol>
      )}

      {!checkingSpecs && missingSpecs.length > 0 && (
        <Alert tone="warning" className="mb-4">
          <strong className="font-semibold">{missingSpecs.join(', ')}</strong> {missingSpecs.length === 1 ? 'has' : 'have'} no
          {isAdmin
            ? <>indexed specs yet — the AI won&apos;t be able to say anything grounded about {missingSpecs.length === 1 ? 'it' : 'them'}. Add specs and index them on the gadget page.</>
            : <>sourced specs ready for AI answers yet, so the AI can&apos;t compare {missingSpecs.length === 1 ? 'it' : 'them'} from official sources.</>}
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

      {askedQuestion && (loading || result || error) && (
        <div className="mt-2">
          <UserBubble question={askedQuestion} />
        </div>
      )}
      <AnswerFrame asTurn={Boolean(askedQuestion && (loading || result || error))}>
      <AiAnswerResult
        streamText={streamText}
        streamSources={streamSources}
        variant="compare"
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
      </AnswerFrame>

      {(turns.length > 0 || result) && !loading && (
        <div className="mt-4 flex items-center justify-end flex-wrap gap-2">
          {turns.length > 0 && (
            <>
              <p className="mr-auto text-xs text-slate-500">
                {thread.enabled ? 'Saved to your account. ' : ''}Follow-ups remember your last {Math.min(turns.length, 3)}{' '}
                question{Math.min(turns.length, 3) === 1 ? '' : 's'}.
              </p>
              {confirmClear ? (
                <>
                  <span className="text-xs font-medium text-slate-700">Clear this conversation?</span>
                  <Button variant="dangerSolid" size="sm" onClick={handleNewChat} loading={thread.clearing}>
                    Clear
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setConfirmClear(false)} disabled={thread.clearing}>
                    Cancel
                  </Button>
                </>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  icon={SquarePen}
                  onClick={() => (thread.enabled ? setConfirmClear(true) : handleNewChat())}
                >
                  New Chat
                </Button>
              )}
            </>
          )}
          {result && (
            <Button variant="outline" size="sm" icon={MessageSquarePlus} onClick={handleAskAnother}>
              Ask Another Question
            </Button>
          )}
        </div>
      )}
    </section>
  )
}

// The live answer, styled like a saved turn (avatar and indent) once a question is on screen.
function AnswerFrame({ asTurn, children }) {
  return asTurn ? <AssistantMessage>{children}</AssistantMessage> : children
}
