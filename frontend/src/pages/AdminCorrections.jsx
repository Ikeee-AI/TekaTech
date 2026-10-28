import { useEffect, useState } from 'react'
import { ShieldCheck, Check, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { api } from '../api/client'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import EmptyState from '../components/EmptyState'
import ErrorState from '../components/ui/ErrorState'
import BackLink from '../components/ui/BackLink'
import Button from '../components/ui/Button'
import { friendlyError } from '../utils/requestErrors'
import { notifyCorrectionsChanged } from '../utils/correctionNotices'

export default function AdminCorrections() {
  useDocumentTitle('Review Corrections')
  const [corrections, setCorrections] = useState([])
  const [loading, setLoading] = useState(true)
  const [resolvingId, setResolvingId] = useState(null)
  const [loadError, setLoadError] = useState(null)

  function load() {
    setLoading(true)
    setLoadError(null)
    api.getCorrections('pending').then(setCorrections).catch((err) => setLoadError(friendlyError(err))).finally(() => setLoading(false))
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
      notifyCorrectionsChanged() // refresh the Review Queue badge
    } catch (err) {
      toast.error(friendlyError(err))
    } finally {
      setResolvingId(null)
    }
  }

  if (loading) {
    return (
      <div className="space-y-3" role="status" aria-label="Loading corrections">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-28 bg-gray-100 rounded-xl animate-pulse" />
        ))}
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="max-w-2xl mx-auto">
        <BackLink to="/">Back to Catalog</BackLink>
        <ErrorState title="Couldn't Load the Review Queue" message={loadError} onRetry={load} />
      </div>
    )
  }

  return (
    <div>
      <BackLink to="/">Back to Catalog</BackLink>

      <h1 className="font-display text-2xl font-medium text-gray-900 tracking-tight mb-1 flex items-center gap-2">
        <ShieldCheck size={22} className="text-sage-700" /> Review Corrections
      </h1>
      <p className="text-sm text-gray-600 mb-6">Community-submitted spec corrections awaiting approval.</p>

      {corrections.length === 0 ? (
        <EmptyState
          icon={ShieldCheck}
          title="Nothing to Review"
          description="No pending corrections right now — the queue is clear."
        />
      ) : (
        <div className="space-y-3">
          {corrections.map((c) => (
            <div key={c.id} className="bg-white border border-gray-200 rounded-xl p-4">
              <p className="text-xs font-medium text-sage-700 uppercase">
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
                  <p className="text-sm text-gray-900 bg-sage-50 rounded-md p-2 whitespace-pre-line">
                    {c.suggested_content}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 mt-4">
                <Button
                  variant="primary"
                  size="sm"
                  icon={Check}
                  loading={resolvingId === c.id}
                  disabled={resolvingId !== null}
                  onClick={() => resolve(c.id, 'approve')}
                >
                  Approve
                </Button>
                <Button variant="danger" size="sm" icon={X} disabled={resolvingId !== null} onClick={() => resolve(c.id, 'reject')}>
                  Reject
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}