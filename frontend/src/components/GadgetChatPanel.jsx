import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowDown, ArrowUp, LogIn, Sparkles, SquarePen } from 'lucide-react'
import { api } from '../api/client'
import { useAiAnswer } from '../hooks/useAiAnswer'
import { useAuth } from '../hooks/useAuth'
import { useGadgetThread } from '../hooks/useGadgetThread'
import { validateAnswerResponse } from '../utils/aiAnswerState'
import { MAX_QUESTION_CHARS } from '../utils/questionLimits'
import { suggestFollowUps } from '../utils/followUps'
import { friendlyError } from '../utils/requestErrors'
import AiAnswerResult, { AnswerOptions } from './AiAnswerResult'
import ThreadTurn, { AssistantMessage, UserBubble } from './ThreadTurn'
import Alert from './ui/Alert'
import Button from './ui/Button'

const COMPOSER_MAX_HEIGHT = 160 // px; the box grows with the text up to this, then scrolls
const NEAR_BOTTOM_PX = 80

function prefersReducedMotion() {
  return Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)
}

/**
 * The AI box on a gadget's page, laid out as a chat (ChatGPT/Claude style): the
 * conversation scrolls inside a fixed-height area, the message box stays at the bottom,
 * Enter sends and Shift+Enter adds a line. A signed-in user's turns are saved by POST /query
 * and reloaded here (user_questions.sql); signed out, the chat lasts for this page view.
 * Each answer is still generated on its own: earlier turns are not sent to the model.
 * Comparisons keep AIComparisonPanel.
 */
export default function GadgetChatPanel({ gadgetId, gadgetName, category, suggestions = [] }) {
  const { user } = useAuth() ?? {}
  const thread = useGadgetThread(gadgetId, user?.id)
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
  const [draft, setDraft] = useState('')
  // The question behind the live (newest) turn; '' when there is none.
  const [askedQuestion, setAskedQuestion] = useState('')
  const [noIndexedSpecs, setNoIndexedSpecs] = useState(false)
  const [confirmClear, setConfirmClear] = useState(false)
  const [atBottom, setAtBottom] = useState(true)
  const scrollRef = useRef(null)
  const liveRef = useRef(null)
  const composerRef = useRef(null)
  const latestRequest = useRef(0)

  useEffect(() => {
    let cancelled = false
    api
      .getSpecs(gadgetId)
      // Only indexed specs reach the AI; pending ones have no embedding yet.
      .then((specs) => !cancelled && setNoIndexedSpecs(!specs.some((s) => s.indexing_status === 'indexed')))
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [gadgetId])

  // --- scrolling ---------------------------------------------------------------------
  function scrollToBottom(smooth = true) {
    const box = scrollRef.current
    if (!box) return
    box.scrollTo({ top: box.scrollHeight, behavior: smooth && !prefersReducedMotion() ? 'smooth' : 'auto' })
  }

  function handleScroll() {
    const box = scrollRef.current
    if (!box) return
    setAtBottom(box.scrollHeight - box.scrollTop - box.clientHeight < NEAR_BOTTOM_PX)
  }

  // Saved turns arrive: start at the newest, like reopening a chat.
  useLayoutEffect(() => {
    if (!thread.loading) scrollToBottom(false)
  }, [thread.loading])

  // A question is sent: follow it down. Its answer arrives: bring the question to the top of
  // the box so a long answer is read from its start, not its end.
  useEffect(() => {
    if (loading) {
      scrollToBottom()
      return
    }
    const box = scrollRef.current
    const live = liveRef.current
    if (!box || !live || (!result && !error)) return
    box.scrollTo({ top: Math.max(0, live.offsetTop - 8), behavior: prefersReducedMotion() ? 'auto' : 'smooth' })
  }, [loading, result, error])

  // --- composer ------------------------------------------------------------------------
  function resizeComposer() {
    const el = composerRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, COMPOSER_MAX_HEIGHT)}px`
  }

  useLayoutEffect(resizeComposer, [draft])

  async function ask(q, { archive }) {
    const question = q.trim()
    if (!question || loading || [...question].length > MAX_QUESTION_CHARS) return
    // Regenerate (re-asking the answer on screen) replaces its saved turn on the server.
    // Retrying after an error does not: a failed answer was never saved, so the newest saved
    // turn with this question is a different, earlier one that must stay.
    const regenerate = !archive && Boolean(result) && !error
    // The answer on screen joins the conversation above; the server saved it already.
    if (archive && result && !error) thread.appendTurn(askedQuestion, result)
    const requestId = ++latestRequest.current
    resetAnswer()
    setAskedQuestion(question)
    setLoading(true)
    try {
      const data = await api.askQuestion({
        question,
        gadget_ids: [gadgetId],
        ...requestOptions,
        ...(regenerate ? { regenerate: true } : {}),
      })
      if (requestId !== latestRequest.current) return
      // A reply without answer text or a valid source list is a failure, never an answer.
      setResult(validateAnswerResponse(data))
      setSourcesOpen(false)
    } catch (err) {
      if (requestId !== latestRequest.current) return
      setError(err)
      // The question goes back in the message box (unless something new was typed), so it can
      // be edited and sent again; Try Again still resends it unchanged.
      setDraft((current) => (current.trim() ? current : question))
    } finally {
      if (requestId === latestRequest.current) setLoading(false)
    }
  }

  function send(text = draft) {
    if (!text.trim() || loading) return
    setDraft('')
    ask(text, { archive: true })
    composerRef.current?.focus()
  }

  function handleKeyDown(e) {
    // Enter sends, Shift+Enter is a new line; never send in the middle of IME composition.
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault()
      send()
    }
  }

  async function handleClear() {
    setConfirmClear(false)
    if (await thread.clear()) {
      latestRequest.current += 1 // an answer still on its way no longer belongs here
      resetAnswer()
      setLoading(false)
      setAskedQuestion('')
      composerRef.current?.focus()
    }
  }

  const followUps = suggestFollowUps({ mode: 'single', gadgetNames: [gadgetName], category, lastQuestion: askedQuestion })
  const specTargets = [{ id: gadgetId, name: gadgetName }]
  const hasConversation = thread.turns.length > 0 || Boolean(askedQuestion)
  const chars = [...draft].length

  return (
    <section
      aria-labelledby="gadget-chat-title"
      className="mt-8 bg-white border border-slate-200 rounded-xl shadow-xs flex flex-col overflow-hidden"
    >
      <header className="flex items-start justify-between gap-3 px-5 sm:px-6 pt-5 pb-3 border-b border-slate-200">
        <div className="min-w-0">
          <h2 id="gadget-chat-title" className="flex items-center gap-2 text-lg font-bold text-slate-900">
            <Sparkles size={18} className="text-rail-700" aria-hidden="true" /> Ask About {gadgetName}
          </h2>
          <p className="text-sm text-slate-600 mt-0.5">
            {allowGeneralKnowledge
              ? 'Answers use its saved specs with numbered sources. General knowledge is on: unmatched answers are labelled unverified.'
              : 'Answers use only its saved specs, with numbered sources. If something isn’t in the specs, TekaTech says so.'}
          </p>
          {!user && (
            <p className="text-xs text-slate-500 mt-1">
              <Link to="/login" className="inline-flex items-center gap-1 font-medium text-rail-700 hover:underline">
                <LogIn size={12} aria-hidden="true" /> Log in
              </Link>{' '}
              to keep this conversation for next time.
            </p>
          )}
        </div>
        {hasConversation &&
          (confirmClear ? (
            <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end" role="group" aria-label="Confirm new chat">
              <span className="text-sm text-slate-700">{user ? 'Delete this conversation?' : 'Start over?'}</span>
              <Button variant="dangerSolid" size="sm" onClick={handleClear} loading={thread.clearing}>
                {user ? 'Delete' : 'Clear'}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setConfirmClear(false)} disabled={thread.clearing}>
                Cancel
              </Button>
            </div>
          ) : (
            <Button variant="ghost" size="sm" icon={SquarePen} onClick={() => setConfirmClear(true)} className="shrink-0">
              New Chat
            </Button>
          ))}
      </header>

      {noIndexedSpecs && (
        <Alert tone="warning" className="mx-5 sm:mx-6 mt-4">
          <strong className="font-semibold">{gadgetName}</strong> has no indexed specs yet — the AI won&apos;t be able to
          say anything grounded about it. Add specs and index them below.
        </Alert>
      )}

      <div className="relative">
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          role="region"
          aria-label={`Conversation about ${gadgetName}`}
          tabIndex={0}
          className="relative max-h-[min(65vh,620px)] min-h-48 overflow-y-auto overscroll-contain px-5 sm:px-6 py-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-rail-400"
        >
          {thread.loading && (
            <p role="status" className="text-sm text-slate-500 text-center py-6">
              Loading your conversation…
            </p>
          )}
          {thread.error && (
            <Alert tone="warning" className="mb-4">
              {friendlyError(thread.error)}
            </Alert>
          )}

          {!hasConversation && !thread.loading && (
            <div className="flex flex-col items-center text-center py-6">
              <span className="inline-flex items-center justify-center size-10 rounded-full bg-rail-100 text-rail-700 mb-3">
                <Sparkles size={20} aria-hidden="true" />
              </span>
              <p className="font-semibold text-slate-900">What would you like to know about {gadgetName}?</p>
              {suggestions.length > 0 && (
                <div className="mt-4 flex flex-wrap justify-center gap-2" role="group" aria-label="Suggested questions">
                  {suggestions.map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => send(q)}
                      className="text-sm font-medium text-rail-800 bg-rail-50 hover:bg-rail-100 border border-rail-200 rounded-full px-3 py-1.5 min-h-10 sm:min-h-8 transition active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rail-400"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {hasConversation && (
            <ol className="space-y-6" aria-label="Messages">
              {thread.turns.map((turn, i) => (
                <ThreadTurn key={turn.id} turn={turn} index={i} specTargets={specTargets} />
              ))}
              {askedQuestion && (
                <li ref={liveRef} className="space-y-3" aria-label={`Latest question: ${askedQuestion}`}>
                  <UserBubble question={askedQuestion} />
                  <AssistantMessage>
                    <AiAnswerResult
                      idPrefix="live"
                      hideOptions
                      loading={loading}
                      error={error}
                      onRetry={() => ask(askedQuestion, { archive: false })}
                      result={result}
                      sourcesOpen={sourcesOpen}
                      setSourcesOpen={setSourcesOpen}
                      highlightedIndex={highlightedIndex}
                      sourceRefs={sourceRefs}
                      handleCiteClick={handleCiteClick}
                      handleCopy={handleCopy}
                      copied={copied}
                      skeletonLines={4}
                      followUps={followUps}
                      onFollowUp={(q) => send(q)}
                      specTargets={specTargets}
                    />
                  </AssistantMessage>
                </li>
              )}
            </ol>
          )}
        </div>

        {!atBottom && hasConversation && (
          <button
            type="button"
            onClick={() => scrollToBottom()}
            aria-label="Jump to latest message"
            className="absolute bottom-3 left-1/2 -translate-x-1/2 inline-flex items-center justify-center size-9 rounded-full bg-white border border-slate-300 shadow-md text-slate-700 hover:bg-slate-50 transition animate-fade-in focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rail-400"
          >
            <ArrowDown size={16} aria-hidden="true" />
          </button>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          send()
        }}
        className="border-t border-slate-200 bg-slate-50/60 px-4 sm:px-6 pt-3 pb-4"
      >
        <div className="flex items-end gap-2 rounded-2xl border border-slate-300 bg-white px-3 py-2 shadow-xs focus-within:border-rail-600 focus-within:ring-2 focus-within:ring-rail-200 transition">
          <label htmlFor="gadget-chat-input" className="sr-only">
            Ask about {gadgetName}
          </label>
          <textarea
            id="gadget-chat-input"
            ref={composerRef}
            rows={1}
            value={draft}
            maxLength={MAX_QUESTION_CHARS}
            placeholder={`Ask anything about ${gadgetName}…`}
            aria-describedby="gadget-chat-hint"
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 resize-none bg-transparent text-[15px] leading-6 text-slate-900 placeholder:text-slate-400 outline-none py-1.5 max-h-40"
          />
          <button
            type="submit"
            disabled={!draft.trim() || loading}
            aria-label="Send question"
            className="inline-flex items-center justify-center size-9 shrink-0 rounded-full bg-rail-700 text-white hover:bg-rail-800 disabled:bg-slate-300 disabled:cursor-not-allowed transition active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rail-600 focus-visible:ring-offset-2"
          >
            <ArrowUp size={18} aria-hidden="true" />
          </button>
        </div>
        <div className="mt-2 flex items-center justify-between gap-3 flex-wrap">
          <AnswerOptions
            plainLanguage={plainLanguage}
            togglePlainLanguage={togglePlainLanguage}
            allowGeneralKnowledge={allowGeneralKnowledge}
            setAllowGeneralKnowledge={setAllowGeneralKnowledge}
          />
          <p id="gadget-chat-hint" className="text-xs text-slate-500 tabular-nums">
            <span className="hidden sm:inline">Enter to send · Shift+Enter for a new line · </span>
            {chars}/{MAX_QUESTION_CHARS}
          </p>
        </div>
      </form>
    </section>
  )
}
