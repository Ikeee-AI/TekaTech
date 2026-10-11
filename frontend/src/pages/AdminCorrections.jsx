import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, ShieldCheck, Check, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { api } from '../api/client'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import EmptyState from '../components/EmptyState'

export default function AdminCorrections() {
  useDocumentTitle('Review Corrections')
  const [corrections, setCorrections] = useState([])
  const [loading, setLoading] = useState(true)
  const [resolvingId, setResolvingId] = useState(null)

  function load() {
    setLoading(true)
    api.getCorrections('pending').then(setCorrections).catch((err) => toast.error(err.message)).finally(() => setLoading(false))
  }

  useEffect(() => {
    // Standard fetch-on-mount pattern used throughout this app (see GadgetList,
    // SpecManager, TrendingQuestions, etc.) — the strict set-state-in-effect
    // rule flags the loading-state toggling inside load(), but this is a
    // correct, ordinary data fetch, not an effect that should be restructured.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load()
  }, [])

  async function resolve(id, action) {
    setResolvingId(id)
    try {
      await api.resolveCorrection(id, action)
      toast.success(action === 'approve' ? 'Correction approved and applied' : 'Correction rejected')
      setCorrections((prev) => prev.filter((c) => c.id !== id))
    } catch (err) {
      toast.error(err.message)
    } finally {
      setResolvingId(null)
    }
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-28 bg-gray-100 rounded-xl animate-pulse" />
        ))}
      </div>
    )
  }

  return (
    <div>
      <Link
        to="/"
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-4 transition rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400"
      >
        <ArrowLeft size={15} /> Back to catalog
      </Link>

      <h1 className="font-display text-2xl font-medium text-gray-900 tracking-tight mb-1 flex items-center gap-2">
        <ShieldCheck size={22} className="text-teal-600" /> Review Corrections
      </h1>
      <p className="text-sm text-gray-500 mb-6">Community-submitted spec corrections awaiting approval.</p>

      {corrections.length === 0 ? (
        <EmptyState
          icon={ShieldCheck}
          title="Nothing to review"
          description="No pending corrections right now — the queue is clear."
        />
      ) : (
        <div className="space-y-3">
          {corrections.map((c) => (
            <div key={c.id} className="bg-white border border-gray-200 rounded-xl p-4">
              <p className="text-xs font-medium text-teal-600 uppercase">
                {c.spec_documents?.gadgets?.name} · {c.spec_documents?.gadgets?.brand}
              </p>
              <div className="mt-3 grid sm:grid-cols-2 gap-3">
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1">Current</p>
                  <p className="text-sm text-gray-600 bg-gray-50 rounded-md p-2 whitespace-pre-line">
                    {c.spec_documents?.content}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1">Suggested</p>
                  <p className="text-sm text-gray-900 bg-teal-50 rounded-md p-2 whitespace-pre-line">
                    {c.suggested_content}
                  </p>
                </div>
              </div>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => resolve(c.id, 'approve')}
                  disabled={resolvingId === c.id}
                  className="flex items-center gap-1 text-xs font-medium bg-teal-600 text-white px-3 py-1.5 rounded-md hover:bg-teal-700 active:scale-95 disabled:opacity-50 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400"
                >
                  <Check size={13} /> Approve
                </button>
                <button
                  onClick={() => resolve(c.id, 'reject')}
                  disabled={resolvingId === c.id}
                  className="flex items-center gap-1 text-xs font-medium text-red-600 border border-red-200 px-3 py-1.5 rounded-md hover:bg-red-50 active:scale-95 disabled:opacity-50 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
                >
                  <X size={13} /> Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}