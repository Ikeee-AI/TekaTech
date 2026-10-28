import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Inbox, Clock, CheckCircle2, XCircle } from 'lucide-react'
import { api } from '../api/client'
import { useAuth } from '../hooks/useAuth'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import EmptyState from '../components/EmptyState'
import ErrorState from '../components/ui/ErrorState'
import BackLink from '../components/ui/BackLink'
import { friendlyError } from '../utils/requestErrors'
import { timeAgo } from '../utils/timeAgo'
import { getSeenUntil, markDecisionsSeen, unseenDecisions } from '../utils/correctionNotices'

// Status is always spelled out in text; the colour and icon only repeat it.
const STATUS = {
  pending: {
    label: 'Pending',
    icon: Clock,
    className: 'text-amber-800 bg-amber-50 border-amber-200',
    note: 'Waiting for an admin to review it.',
  },
  approved: {
    label: 'Approved',
    icon: CheckCircle2,
    className: 'text-emerald-800 bg-emerald-50 border-emerald-200',
    note: 'An admin approved it, and the spec now uses your text.',
  },
  rejected: {
    label: 'Rejected',
    icon: XCircle,
    className: 'text-red-800 bg-red-50 border-red-200',
    note: 'An admin reviewed it and kept the current text.',
  },
}

function formatDate(iso) {
  return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}

function StatusPill({ status }) {
  const { label, icon: Icon, className } = STATUS[status] ?? STATUS.pending
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold rounded-full px-2 py-0.5 border ${className}`}>
      <Icon size={13} aria-hidden="true" />
      {label}
    </span>
  )
}

function When({ label, iso }) {
  if (!iso) return null
  return (
    <span>
      {label}{' '}
      <time dateTime={iso} title={formatDate(iso)}>
        {timeAgo(iso)}
      </time>
    </span>
  )
}

export default function MySuggestions() {
  useDocumentTitle('My Suggestions')
  const { user } = useAuth()
  const userId = user?.id
  const [state, setState] = useState({ status: 'loading', items: [], newIds: new Set(), error: null })

  const load = useCallback(() => {
    setState((s) => ({ ...s, status: 'loading', error: null }))
    // Read before fetching: a second load already in flight (React StrictMode
    // runs effects twice in dev) must not see this load's "mark seen".
    const seenBefore = getSeenUntil(userId)
    api
      .getMyCorrections()
      .then((items) => {
        // Highlight what was decided since the last visit, then mark it seen
        // (this also clears the navbar badge).
        const newIds = new Set(unseenDecisions(items, seenBefore).map((item) => item.id))
        setState({ status: 'ready', items, newIds, error: null })
        markDecisionsSeen(userId, items)
      })
      .catch((err) => setState({ status: 'error', items: [], newIds: new Set(), error: friendlyError(err) }))
  }, [userId])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- app-wide fetch convention (see CLAUDE.md)
    load()
  }, [load])

  if (state.status === 'loading') {
    return (
      <div className="space-y-3" role="status" aria-label="Loading your suggestions">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-28 bg-gray-100 rounded-xl animate-pulse" />
        ))}
      </div>
    )
  }

  if (state.status === 'error') {
    return (
      <div className="max-w-2xl mx-auto">
        <BackLink to="/">Back to Catalog</BackLink>
        <ErrorState title="Couldn't Load Your Suggestions" message={state.error} onRetry={load} />
      </div>
    )
  }

  const { items, newIds } = state

  return (
    <div>
      <BackLink to="/">Back to Catalog</BackLink>

      <h1 className="font-display text-2xl font-medium text-gray-900 tracking-tight mb-1 flex items-center gap-2">
        <Inbox size={22} className="text-sage-700" aria-hidden="true" /> My Suggestions
      </h1>
      <p className="text-sm text-gray-600 mb-6">
        Spec corrections you suggested, newest first, and whether an admin approved or rejected them.
      </p>

      {items.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title="No Suggestions Yet"
          description="You haven't suggested any corrections yet. Open a gadget and choose Suggest Correction on one of its specs."
          action={
            <Link to="/" className="inline-flex items-center min-h-10 text-sm font-semibold text-sage-700 hover:underline rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage-600">
              Browse the catalog
            </Link>
          }
        />
      ) : (
        <ul className="space-y-3">
          {items.map((item) => {
            const { note } = STATUS[item.status] ?? STATUS.pending
            const isNew = newIds.has(item.id)
            return (
              <li key={item.id} className="bg-white border border-gray-200 rounded-xl p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusPill status={item.status} />
                  {isNew && (
                    <span className="text-xs font-semibold text-sage-800 bg-sage-50 border border-sage-200 rounded-full px-2 py-0.5">
                      New decision
                    </span>
                  )}
                  {item.gadget ? (
                    <Link
                      to={`/gadgets/${item.gadget.id}`}
                      className="inline-flex items-center min-h-10 sm:min-h-0 text-sm font-semibold text-sage-700 hover:underline rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage-600"
                    >
                      {item.gadget.name}
                      {item.gadget.brand ? ` · ${item.gadget.brand}` : ''}
                    </Link>
                  ) : (
                    <span className="text-sm text-gray-500">Gadget no longer available</span>
                  )}
                </div>

                <p className="text-sm text-gray-600 mt-2">{note}</p>
                <p className="text-xs text-gray-500 mt-1 flex flex-wrap gap-x-3">
                  <When label="Submitted" iso={item.created_at} />
                  {item.status !== 'pending' && (
                    <When label={item.status === 'approved' ? 'Approved' : 'Rejected'} iso={item.reviewed_at} />
                  )}
                </p>

                <div className="mt-3 grid sm:grid-cols-2 gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-gray-500 mb-1">Your suggestion</p>
                    <p className="text-sm text-gray-900 bg-sage-50 rounded-md p-2 whitespace-pre-line break-words">
                      {item.suggested_content}
                    </p>
                  </div>
                  {item.spec_excerpt && (
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-gray-500 mb-1">Spec text now</p>
                      <p className="text-sm text-gray-600 bg-gray-50 rounded-md p-2 whitespace-pre-line break-words">
                        {item.spec_excerpt}
                      </p>
                    </div>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
