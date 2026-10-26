import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { X, Sparkles, ImageOff, Trophy, Share2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { api } from '../api/client'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import EmptyState from '../components/EmptyState'
import ErrorState from '../components/ui/ErrorState'
import BackLink from '../components/ui/BackLink'
import AIComparisonPanel from '../components/AIComparisonPanel'
import { friendlyError } from '../utils/requestErrors'

// Matches the backend's MAX_COMPARISON_GADGETS (routers/comparisons.py).
const MAX_COMPARE_GADGETS = 5

/** Unique ids from ?ids=, in order, capped. A repeated id would render twice under one React key. */
function parseIds(raw) {
  const unique = [...new Set((raw || '').split(',').map((id) => id.trim()).filter(Boolean))]
  return unique.slice(0, MAX_COMPARE_GADGETS)
}

/** The single cheapest price, or null when fewer than 2 gadgets have a price or the lowest is tied. */
function strictlyLowestPrice(gadgets) {
  const prices = gadgets.map((g) => g.price_php).filter((p) => p != null)
  if (prices.length < 2) return null
  const lowest = Math.min(...prices)
  return prices.filter((p) => p === lowest).length === 1 ? lowest : null
}

function formatDate(date) {
  if (!date) return '—'
  const d = new Date(date)
  return Number.isNaN(d.getTime()) ? date : d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' })
}

/** Value cell; the cheapest price gets a visible "Lowest price" label, not just color and an icon. */
function CompareValue({ row, gadget }) {
  const isHighlighted = row.highlight?.(gadget)
  if (!isHighlighted) return row.get(gadget)
  return (
    <span className="inline-flex flex-col items-center sm:items-start gap-0.5">
      <span className="inline-flex items-center gap-1 text-green-800 font-semibold bg-green-50 rounded-full px-2 py-0.5">
        <Trophy size={11} aria-hidden="true" />
        {row.get(gadget)}
      </span>
      <span className="text-xs font-semibold text-green-800">Lowest price</span>
    </span>
  )
}

export default function ComparePage() {
  useDocumentTitle('Compare')
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const ids = useMemo(() => parseIds(searchParams.get('ids')), [searchParams])

  const [gadgets, setGadgets] = useState([])
  const [loading, setLoading] = useState(ids.length > 0)
  const [sharing, setSharing] = useState(false)
  const [loadError, setLoadError] = useState(null)
  const [attempt, setAttempt] = useState(0)
  // The link belongs to one exact set of gadgets; changing the set makes it stale.
  const idsKey = ids.join(',')
  const [share, setShare] = useState(null)
  const shareUrl = share?.key === idsKey ? share.url : null

  useEffect(() => {
    if (ids.length === 0) {
      return
    }
    // Standard fetch-on-mount/on-id-change pattern used throughout this app —
    // the strict set-state-in-effect rule flags this, but it's a correct,
    // ordinary data fetch (loading toggled around a real async call).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true)
    Promise.all(
      ids.map((id) =>
        api.getGadget(id).catch((err) => {
          // 404 (gadget deleted) or 422 (malformed id) means this gadget can't load; anything else should fail the whole load so it can be retried.
          if (err.status !== 404 && err.status !== 422) throw err
          toast.error('One gadget could not be loaded — it may have been deleted', { id: 'gadget-missing' })
          return null
        })
      )
    )
      .then((results) => {
        setLoadError(null)
        setGadgets(results.filter(Boolean))
      })
      .catch((err) => setLoadError(err))
      .finally(() => setLoading(false))
  }, [ids, attempt])

  async function handleShare() {
    let url = shareUrl
    if (!url) {
      setSharing(true)
      try {
        const result = await api.createComparisonLink(gadgets.map((g) => g.id))
        url = `${window.location.origin}/c/${result.slug}`
        setShare({ key: idsKey, url })
      } catch (err) {
        toast.error(friendlyError(err))
        return
      } finally {
        setSharing(false)
      }
    }
    try {
      await navigator.clipboard.writeText(url)
      toast.success('Link copied to clipboard')
    } catch {
      toast('Link created. Copy it from the box below.')
    }
  }

  function removeGadget(id) {
    const next = ids.filter((i) => i !== id)
    if (next.length === 0) {
      navigate('/')
    } else {
      setSearchParams({ ids: next.join(',') })
    }
  }

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4" role="status" aria-label="Loading comparison">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-64 bg-gray-100 rounded-xl animate-pulse" />
        ))}
      </div>
    )
  }

  if (loadError) {
    return (
      <ErrorState
        title="Couldn't Load This Comparison"
        message={friendlyError(loadError)}
        onRetry={() => {
          setLoadError(null)
          setAttempt((a) => a + 1)
        }}
      />
    )
  }

  if (ids.length < 2 || gadgets.length < 2) {
    return (
      <EmptyState
        icon={Sparkles}
        title="Pick at Least 2 Gadgets to Compare"
        description="Head back to the catalog, select 2–3 gadgets using the checkmarks, then hit Compare."
        action={
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 bg-sage-700 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-sage-800 active:scale-95 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage-600 focus-visible:ring-offset-2"
          >
            Back to Catalog
          </Link>
        }
      />
    )
  }

  const cheapestPrice = strictlyLowestPrice(gadgets)

  const rows = [
    { label: 'Brand', get: (g) => g.brand },
    { label: 'Category', get: (g) => g.category },
    {
      label: 'Price',
      get: (g) => (g.price_php != null ? `Php ${g.price_php.toLocaleString()}` : '—'),
      highlight: (g) => cheapestPrice != null && g.price_php === cheapestPrice,
    },
    { label: 'Released', get: (g) => formatDate(g.release_date) },
  ]

  return (
    <div>
      <BackLink to="/">Back to Catalog</BackLink>

      <div className="flex items-center justify-between flex-wrap gap-3 mb-1">
        <h1 className="font-display text-xl sm:text-2xl font-medium text-gray-900 tracking-tight">
          Comparing {gadgets.length} Gadgets
        </h1>
        <button
          type="button"
          onClick={handleShare}
          disabled={sharing}
          aria-busy={sharing || undefined}
          className="flex items-center gap-1.5 text-xs font-medium text-sage-700 border border-sage-200 rounded-md px-3 py-1.5 min-h-10 sm:min-h-9 hover:bg-sage-50 active:scale-95 disabled:opacity-50 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage-600"
        >
          <Share2 size={13} /> {sharing ? 'Creating Link…' : 'Share'}
        </button>
      </div>
      <p className="text-sm text-gray-500 mb-6">Side-by-side spec comparison.</p>
      {shareUrl && (
        <div className="flex items-center gap-2 -mt-3 mb-6">
                    <label htmlFor="share-url" className="text-xs font-medium text-gray-600 shrink-0">
            Share Link
          </label>
          <input
            id="share-url"
            readOnly
            value={shareUrl}
            onFocus={(e) => e.target.select()}
            className="flex-1 min-w-0 text-sm text-gray-700 bg-slate-50 border border-slate-200 rounded-md px-2 py-1.5"
          />
        </div>
      )}

      {/* Desktop / tablet: table */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full border-collapse min-w-[500px]">
          <caption className="sr-only">Spec comparison of {gadgets.map((g) => g.name).join(', ')}</caption>
          <thead>
            <tr>
              <td className="w-28" />
              {gadgets.map((g) => (
                <th key={g.id} scope="col" className="text-left align-top pb-3 px-2">
                  <div className="relative bg-white border border-gray-200 rounded-xl p-3">
                    <button
                      onClick={() => removeGadget(g.id)}
                      aria-label={`Remove ${g.name} from comparison`}
                      className="absolute top-1.5 right-1.5 w-8 h-8 flex items-center justify-center text-slate-600 hover:text-red-700 hover:bg-red-50 transition rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
                    >
                      <X size={16} aria-hidden="true" />
                    </button>
                    <div className="h-20 w-full bg-gray-50 rounded-lg overflow-hidden mb-2 flex items-center justify-center">
                      {g.image_url ? (
                        <img src={g.image_url} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <ImageOff size={18} className="text-gray-300" />
                      )}
                    </div>
                    <Link
                      to={`/gadgets/${g.id}`}
                      className="font-semibold text-sm text-gray-900 hover:underline block rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage-600"
                    >
                      {g.name}
                    </Link>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label} className="border-t border-gray-100">
                <th scope="row" className="text-left text-xs font-semibold uppercase tracking-wider text-gray-600 py-3 pr-2">
                  {row.label}
                </th>
                {gadgets.map((g) => (
                  <td key={g.id} className="py-3 px-2 text-sm text-gray-800">
                    <CompareValue row={row} gadget={g} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile: gadgets as columns and specs as rows, so values line up for comparison
          instead of sitting in separate cards the user has to scroll between. */}
      <div className="sm:hidden">
        <div
          className="grid gap-2"
          style={{ gridTemplateColumns: `repeat(${gadgets.length}, minmax(0, 1fr))` }}
        >
          {gadgets.map((g) => (
            <div key={g.id} className="relative bg-white border border-gray-200 rounded-xl p-2 pt-3 flex flex-col items-center text-center min-w-0">
              <button
                onClick={() => removeGadget(g.id)}
                aria-label={`Remove ${g.name} from comparison`}
                // 32px visible, 40px to touch: the ::before widens the hit area.
                className="absolute -top-2 -right-2 w-8 h-8 before:absolute before:-inset-1 before:content-[''] flex items-center justify-center bg-white border border-gray-200 rounded-full shadow-xs text-slate-600 hover:text-red-700 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
              >
                <X size={16} aria-hidden="true" />
              </button>
              <div className="h-14 w-14 bg-gray-50 rounded-lg overflow-hidden flex items-center justify-center mb-2">
                {g.image_url ? (
                  <img src={g.image_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <ImageOff size={18} className="text-gray-400" aria-hidden="true" />
                )}
              </div>
              <Link
                to={`/gadgets/${g.id}`}
                className="text-sm font-semibold text-gray-900 leading-tight break-words hover:underline rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage-600"
              >
                {g.name}
              </Link>
            </div>
          ))}
        </div>

        <dl className="mt-4 bg-white border border-gray-200 rounded-xl divide-y divide-gray-100">
          {rows.map((row) => (
            // dt and dd must be direct children of this wrapper for a valid <dl>,
            // so the label spans the whole grid row instead of sitting outside it.
            <div
              key={row.label}
              className="px-3 py-3 grid gap-x-2 gap-y-1.5"
              style={{ gridTemplateColumns: `repeat(${gadgets.length}, minmax(0, 1fr))` }}
            >
              <dt className="col-span-full text-xs font-semibold uppercase tracking-wider text-gray-600">{row.label}</dt>
              {gadgets.map((g) => (
                <dd key={g.id} className="min-w-0 text-center text-sm text-gray-800 break-words">
                  <span className="sr-only">{g.name}: </span>
                  <CompareValue row={row} gadget={g} />
                </dd>
              ))}
            </div>
          ))}
        </dl>
      </div>

      <AIComparisonPanel gadgetIds={gadgets.map((g) => g.id)} gadgetNames={gadgets.map((g) => g.name)} />
    </div>
  )
}