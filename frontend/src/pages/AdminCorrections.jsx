import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ShieldCheck, Check, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { api } from '../api/client'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import EmptyState from '../components/EmptyState'
import ErrorState from '../components/ui/ErrorState'
import BackLink from '../components/ui/BackLink'
import Button from '../components/ui/Button'
import Alert from '../components/ui/Alert'
import CorrectionDiff from '../components/CorrectionDiff'
import { friendlyError } from '../utils/requestErrors'
import { notifyCorrectionsChanged } from '../utils/correctionNotices'

export default function AdminCorrections() {
  useDocumentTitle('Review Corrections')
  const [corrections, setCorrections] = useState([])
  const [loading, setLoading] = useState(true)
  const [resolvingId, setResolvingId] = useState(null)
  const [loadError, setLoadError] = useState(null)
  // Approved corrections whose spec couldn't be re-indexed automatically.
  const [indexNotices, setIndexNotices] = useState([])
  // Focus moves here once a card is approved or rejected and leaves the list,
  // instead of being lost with the removed card's buttons.
  const headingRef = useRef(null)

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

  // Approving rewrites the spec text, and the database then clears its embedding
  // (back to pending), so it drops out of AI answers until it is indexed again.
  // Re-index straight away; if that fails the approved text is still saved.
  async function reindexApprovedSpec(correction) {
    const specId = correction.spec_document_id
    const gadgetId = correction.spec_documents?.gadget_id
    const gadgetName = correction.spec_documents?.gadgets?.name ?? 'this gadget'
    if (!specId || !gadgetId) {
      setIndexNotices((prev) => [...prev, { id: correction.id, gadgetId: null, gadgetName }])
      return
    }
    try {
      await api.indexSpec(gadgetId, specId)
      toast.success('Correction approved, applied and re-indexed for AI answers')
    } catch {
      setIndexNotices((prev) => [...prev, { id: correction.id, gadgetId, gadgetName }])
    }
  }

  async function resolve(correction, action) {
    const id = correction.id
    setResolvingId(id)
    try {
      await api.resolveCorrection(id, action)
      notifyCorrectionsChanged() // refresh the Review Queue badge
      // The card stays (Approve spinner showing) until re-indexing finishes.
      if (action === 'approve') await reindexApprovedSpec(correction)
      else toast.success('Correction rejected')
      setCorrections((prev) => prev.filter((c) => c.id !== id))
      headingRef.current?.focus()
    } catch (err) {
      toast.error(friendlyError(err))
    } finally {
      setResolvingId(null)
    }
  }

  function dismissNotice(id) {
    setIndexNotices((prev) => prev.filter((n) => n.id !== id))
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

      <h1
        ref={headingRef}
        tabIndex={-1}
        className="font-display text-2xl font-medium text-gray-900 tracking-tight mb-1 flex items-center gap-2"
      >
        <ShieldCheck size={22} className="text-rail-700" /> Review Corrections
      </h1>
      <p className="text-sm text-gray-600 mb-6">Community-submitted spec corrections awaiting approval.</p>

      {indexNotices.length > 0 && (
        <div className="space-y-2 mb-6">
          {indexNotices.map((n) => (
            <Alert
              key={n.id}
              tone="warning"
              title="Correction approved — spec saved but pending indexing"
              action={
                <div className="flex flex-wrap gap-2">
                  {n.gadgetId && (
                    <Button as={Link} to={`/gadgets/${n.gadgetId}`} variant="secondary" size="sm">
                      Open {n.gadgetName}
                    </Button>
                  )}
                  <Button variant="ghost" size="sm" onClick={() => dismissNotice(n.id)}>
                    Dismiss
                  </Button>
                </div>
              }
            >
              Spec for {n.gadgetName} updated — re-index it on the gadget page so AI answers use it. Until then, AI
              answers leave this spec out.
            </Alert>
          ))}
        </div>
      )}

      {corrections.length === 0 ? (
        <EmptyState
          icon={ShieldCheck}
          title="Nothing to Review"
          description="No pending corrections right now — the queue is clear."
        />
      ) : (
        <div className="space-y-3">
          {corrections.map((c) => (
            <article key={c.id} className="bg-white border border-gray-200 rounded-xl p-4">
              <h2 className="text-xs font-medium text-rail-700 uppercase">
                {c.spec_documents?.gadgets?.name} · {c.spec_documents?.gadgets?.brand}
              </h2>
              <div className="mt-3">
                <CorrectionDiff current={c.spec_documents?.content} suggested={c.suggested_content} />
              </div>
              <div className="flex flex-wrap gap-2 mt-4">
                <Button
                  variant="primary"
                  size="sm"
                  icon={Check}
                  loading={resolvingId === c.id}
                  disabled={resolvingId !== null}
                  onClick={() => resolve(c, 'approve')}
                  aria-label={`Approve correction for ${c.spec_documents?.gadgets?.name ?? 'this spec'}`}
                >
                  Approve
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  icon={X}
                  disabled={resolvingId !== null}
                  onClick={() => resolve(c, 'reject')}
                  aria-label={`Reject correction for ${c.spec_documents?.gadgets?.name ?? 'this spec'}`}
                >
                  Reject
                </Button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}