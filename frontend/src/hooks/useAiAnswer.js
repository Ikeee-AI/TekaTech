import { useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { getPlainLanguagePref, setPlainLanguagePref } from '../utils/preferences'

/** The answer options part of a POST /query body. `allow_general_knowledge` is sent only
 * when the user turned it on, so a request with it off is exactly what it was before #172
 * (the backend defaults it to false). */
export function answerRequestOptions({ plainLanguage, allowGeneralKnowledge, allowWebSearch }) {
  const options = { plain_language: plainLanguage }
  if (allowGeneralKnowledge) options.allow_general_knowledge = true
  // Optional web search (24 Nov 2026): sent only when on, like general knowledge.
  if (allowWebSearch) options.allow_web_search = true
  return options
}

/** Shared state + behavior behind AIAnswerPanel and AIComparisonPanel:
 * loading/error/result for one AI query, the plain-language and general-knowledge
 * toggles, citation click-to-scroll, and copy-to-clipboard. Callers own the actual
 * ask() trigger (params differ: single gadget vs comparison scope). */
export function useAiAnswer() {
  const [plainLanguage, setPlainLanguage] = useState(getPlainLanguagePref)
  // Opt-in and unverified, so it starts off on every visit and is not saved like
  // plain language is. Like plain language, a change applies to the next question
  // (or Regenerate), not to the answer already on screen.
  const [allowGeneralKnowledge, setAllowGeneralKnowledge] = useState(false)
  // Opt-in web search (24 Nov 2026): same rules as general knowledge, off on every visit.
  const [allowWebSearch, setAllowWebSearch] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [result, setResult] = useState(null)
  const [sourcesOpen, setSourcesOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(null)
  const sourceRefs = useRef([])
  // Streaming (23 Nov 2026): the answer text so far and its numbered sources, shown while the
  // answer is still being written; the finished answer (result) replaces them.
  const [streamText, setStreamText] = useState('')
  const [streamSources, setStreamSources] = useState([])
  const streamId = useRef(0)

  /** Handlers for one api.askQuestion call. A newer question makes older handlers do nothing,
   * so a superseded stream can't write into the new answer. */
  function startStream() {
    const id = ++streamId.current
    setStreamText('')
    setStreamSources([])
    return {
      onSources: (sources) => id === streamId.current && setStreamSources(sources),
      onDelta: (piece) => id === streamId.current && setStreamText((t) => t + piece),
      // The streamed text was a decline that a web or general-knowledge answer replaces:
      // clear it so the panel shows its loading state, not the decline, while that answer is made.
      onReset: () => {
        if (id !== streamId.current) return
        setStreamText('')
        setStreamSources([])
      },
    }
  }

  function togglePlainLanguage(checked) {
    setPlainLanguage(checked)
    setPlainLanguagePref(checked)
  }

  // Opens the source list and moves focus to the cited source, so keyboard and
  // screen-reader users land on it too (not just a visual scroll).
  function handleCiteClick(index) {
    setSourcesOpen(true)
    setHighlightedIndex(index)
    setTimeout(() => {
      const el = sourceRefs.current[index]
      if (!el) return
      const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
      el.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'nearest' })
      el.focus({ preventScroll: true })
    }, 50)
    setTimeout(() => setHighlightedIndex(null), 1800)
  }

  // Clears the previous answer (and any error) so the caller can show its
  // question input again for a follow-up question.
  function resetAnswer() {
    streamId.current += 1
    setStreamText('')
    setStreamSources([])
    setResult(null)
    setError(null)
    setSourcesOpen(false)
    setHighlightedIndex(null)
    setCopied(false)
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(result.answer)
    } catch {
      toast.error('Copy failed — your browser blocked clipboard access')
      return
    }
    setCopied(true)
    toast.success('Answer copied')
    setTimeout(() => setCopied(false), 1500)
  }

  return {
    plainLanguage,
    togglePlainLanguage,
    allowGeneralKnowledge,
    setAllowGeneralKnowledge,
    allowWebSearch,
    setAllowWebSearch,
    requestOptions: answerRequestOptions({ plainLanguage, allowGeneralKnowledge, allowWebSearch }),
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
  }
}
