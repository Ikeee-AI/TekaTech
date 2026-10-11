import { useEffect, useState } from 'react'
import { FileText, Plus, Loader2, ExternalLink, Calendar, Flag } from 'lucide-react'
import toast from 'react-hot-toast'
import { api } from '../api/client'
import { useAuth } from '../hooks/useAuth'
import { timeAgo } from '../utils/timeAgo'

function formatDate(iso) {
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

export default function SpecManager({ gadgetId, onSpecsChange }) {
  const { user } = useAuth()
  const [indexingId, setIndexingId] = useState(null)
  const [specs, setSpecs] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [rawText, setRawText] = useState('')
  const [sourceUrl, setSourceUrl] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [correctingId, setCorrectingId] = useState(null)
  const [correctionText, setCorrectionText] = useState('')
  const [submittingCorrection, setSubmittingCorrection] = useState(false)

  useEffect(() => {
    loadSpecs()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gadgetId])

  function loadSpecs() {
    setLoading(true)
    api
      .getSpecs(gadgetId)
      .then((data) => {
        setSpecs(data)
        onSpecsChange?.(data)
      })
      .catch((err) => toast.error(err.message))
      .finally(() => setLoading(false))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!rawText.trim()) return
    setSubmitting(true)
    try {
      const result = await api.ingestSpecs(gadgetId, { raw_text: rawText, source_url: sourceUrl || undefined })
      toast.success(`${result.chunks_created} spec chunk${result.chunks_created === 1 ? '' : 's'} saved — AI indexing pending`)
      setRawText('')
      setSourceUrl('')
      setShowForm(false)
      loadSpecs()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleIndex(specId) {
    setIndexingId(specId)
    try {
      await api.indexSpec(gadgetId, specId)
      toast.success('Spec ready for AI questions')
      loadSpecs()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setIndexingId(null)
    }
  }

  function startCorrection(spec) {
    setCorrectingId(spec.id)
    setCorrectionText(spec.content)
  }

  async function submitCorrection(specId) {
    if (!correctionText.trim()) return
    setSubmittingCorrection(true)
    try {
      await api.submitCorrection(specId, { suggested_content: correctionText })
      toast.success('Correction submitted for review')
      setCorrectingId(null)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSubmittingCorrection(false)
    }
  }

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-display text-lg font-semibold text-gray-900 flex items-center gap-2">
          <FileText size={17} className="text-teal-600" /> Specifications
        </h2>
        <button
          onClick={() => setShowForm((s) => !s)}
          aria-expanded={showForm}
          className="flex items-center gap-1 text-xs font-medium text-teal-600 border border-teal-200 rounded-md px-2.5 py-1.5 hover:bg-teal-50 active:scale-95 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400"
        >
          <Plus size={14} /> Add specs
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-xl p-4 mb-4 space-y-3 animate-fade-in">
          <div>
            <label htmlFor="raw-text" className="block text-xs font-medium text-gray-700 mb-1">Raw spec text</label>
            <textarea
              id="raw-text"
              required
              rows={6}
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder={'Paste spec sheet text here, e.g.:\n\nDisplay: 6.2-inch AMOLED, 120Hz...\n\nBattery: 4000mAh, 25W fast charging...'}
              className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm font-mono focus:border-teal-400 focus:ring-1 focus:ring-teal-400 outline-none transition resize-y"
            />
            <p className="text-xs text-gray-400 mt-1">
              Separate distinct facts with blank lines — each becomes its own retrievable chunk.
            </p>
          </div>
          <div>
            <label htmlFor="source-url" className="block text-xs font-medium text-gray-700 mb-1">Source URL (optional)</label>
            <input
              id="source-url"
              type="url"
              value={sourceUrl}
              onChange={(e) => setSourceUrl(e.target.value)}
              placeholder="https://..."
              className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:border-teal-400 focus:ring-1 focus:ring-teal-400 outline-none transition"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center justify-center gap-1.5 flex-1 bg-teal-600 text-white text-sm font-medium py-2 rounded-md hover:bg-teal-700 active:scale-95 disabled:opacity-50 disabled:active:scale-100 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 focus-visible:ring-offset-2"
            >
              {submitting ? (
                <>
                  <Loader2 size={14} className="animate-spin" /> Saving...
                </>
              ) : (
                'Save specs'
              )}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-md hover:bg-gray-50 active:scale-95 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <p className="text-xs text-gray-500 mb-3">
        Specs are saved immediately. Use Index for AI when credit is available; pending specs remain readable here.
      </p>
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : specs.length === 0 ? (
        <p className="text-sm text-gray-400 bg-white border border-gray-200 border-dashed rounded-xl px-4 py-6 text-center">
          No specs added yet. Add some so this gadget can be searched and compared by the AI.
        </p>
      ) : (
        <div className="space-y-2">
          {specs.map((spec) => (
            <div key={spec.id} className="bg-white border border-gray-200 rounded-lg px-4 py-3">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs text-gray-500">
                  {spec.indexing_status === 'indexed' ? 'Ready for AI' : 'Pending AI indexing'}
                </span>
                {user && spec.indexing_status !== 'indexed' && (
                  <button onClick={() => handleIndex(spec.id)} disabled={indexingId !== null}
                    className="text-xs text-teal-600 hover:underline disabled:opacity-50">
                    {indexingId === spec.id ? 'Indexing...' : 'Index for AI'}
                  </button>
                )}
              </div>
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm text-gray-700 whitespace-pre-line">{spec.content}</p>
                <span className="shrink-0 text-[10px] font-mono text-gray-400 bg-gray-50 rounded px-1.5 py-0.5">
                  #{spec.chunk_index}
                </span>
              </div>

              <div className="flex items-center justify-between mt-2">
                <div className="flex items-center gap-3">
                  {spec.source_url && (

                    <a  href={spec.source_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-teal-600 hover:underline rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400"
                    >
                      <ExternalLink size={11} /> Source
                    </a>
                  )}
                  <span className="inline-flex items-center gap-1 text-xs text-gray-400" title={formatDate(spec.verified_at)}>
                    <Calendar size={11} /> Verified {timeAgo(spec.verified_at)}
                  </span>
                  {Date.now() - new Date(spec.verified_at).getTime() > 1000 * 60 * 60 * 24 * 180 && (
                    <span className="text-xs text-amber-600 font-medium">May be outdated</span>
                  )}
                </div>
                <button
                  onClick={() => startCorrection(spec)}
                  className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-teal-600 transition rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400"
                >
                  <Flag size={11} /> Suggest correction
                </button>
              </div>

              {correctingId === spec.id && (
                <div className="mt-3 pt-3 border-t border-gray-100 animate-fade-in">
                  <label htmlFor={`correction-${spec.id}`} className="block text-xs font-medium text-gray-700 mb-1">
                    Suggested correction
                  </label>
                  <textarea
                    id={`correction-${spec.id}`}
                    rows={3}
                    value={correctionText}
                    onChange={(e) => setCorrectionText(e.target.value)}
                    className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm font-mono focus:border-teal-400 focus:ring-1 focus:ring-teal-400 outline-none transition resize-y"
                  />
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => submitCorrection(spec.id)}
                      disabled={submittingCorrection}
                      className="text-xs font-medium bg-teal-600 text-white px-3 py-1.5 rounded-md hover:bg-teal-700 active:scale-95 disabled:opacity-50 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400"
                    >
                      {submittingCorrection ? 'Submitting...' : 'Submit for review'}
                    </button>
                    <button
                      onClick={() => setCorrectingId(null)}
                      className="text-xs font-medium text-gray-600 border border-gray-200 px-3 py-1.5 rounded-md hover:bg-gray-50 active:scale-95 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
