import { useEffect } from 'react'
import { Sparkles, X } from 'lucide-react'
import { api } from '../api/client'
import { useAiAnswer } from '../hooks/useAiAnswer'
import AiAnswerResult, { AnswerSkeleton } from './AiAnswerResult'

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
    setLoading(true)
    setError(null)
    try {
      const data = await api.askQuestion({ question, plain_language: plainLanguage })
      setResult(data)
      setSourcesOpen(false)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    ask()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [question])

  return (
    <div className="bg-white border border-teal-200 rounded-xl p-5 mb-4 animate-fade-in">
      <div className="flex items-start justify-between gap-3 mb-1">
        <div className="flex items-center gap-2 min-w-0">
          <Sparkles size={16} className="text-teal-600 shrink-0" />
          <p className="text-sm font-medium text-gray-900 truncate">&quot;{question}&quot;</p>
        </div>
        <button
          onClick={onClose}
          aria-label="Close AI answer"
          className="text-gray-400 hover:text-gray-600 transition shrink-0 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400"
        >
          <X size={16} />
        </button>
      </div>

      {loading && <AnswerSkeleton />}

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
    </div>
  )
}
