import { useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { getPlainLanguagePref, setPlainLanguagePref } from '../utils/preferences'

/** Shared state + behavior behind AIAnswerPanel and AIComparisonPanel:
 * loading/error/result for one AI query, the plain-language toggle, citation
 * click-to-scroll, and copy-to-clipboard. Callers own the actual ask()
 * trigger (params differ: single gadget vs comparison scope). */
export function useAiAnswer() {
  const [plainLanguage, setPlainLanguage] = useState(getPlainLanguagePref)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [result, setResult] = useState(null)
  const [sourcesOpen, setSourcesOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(null)
  const sourceRefs = useRef([])

  function togglePlainLanguage(checked) {
    setPlainLanguage(checked)
    setPlainLanguagePref(checked)
  }

  function handleCiteClick(index) {
    setSourcesOpen(true)
    setHighlightedIndex(index)
    setTimeout(() => {
      sourceRefs.current[index]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }, 50)
    setTimeout(() => setHighlightedIndex(null), 1800)
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
  }
}
