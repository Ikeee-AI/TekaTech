import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, X, Sparkles, ImageOff, Trophy, Share2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { api } from '../api/client'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import EmptyState from '../components/EmptyState'
import ErrorState from '../components/ui/ErrorState'
import AIComparisonPanel from '../components/AIComparisonPanel'
import { friendlyError } from '../utils/requestErrors'

export default function ComparePage() {
  useDocumentTitle('Compare')
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const ids = useMemo(() => (searchParams.get('ids') || '').split(',').filter(Boolean), [searchParams])

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
          // Only a 404 means the gadget is gone; anything else should fail the whole load so it can be retried.
          if (err.status !== 404) throw err
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
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
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
            className="inline-flex items-center gap-1.5 bg-sage-700 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-sage-800 active:scale-95 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage-400 focus-visible:ring-offset-2"
          >
            Back to Catalog
          </Link>
        }
      />
    )
  }

  const cheapestPrice = Math.min(...gadgets.filter((g) => g.price_php).map((g) => g.price_php))

  const rows = [
    { label: 'Brand', get: (g) => g.brand },
    { label: 'Category', get: (g) => g.category },
    {
      label: 'Price',
      get: (g) => (g.price_php ? `Php ${g.price_php.toLocaleString()}` : '—'),
      highlight: (g) => g.price_php === cheapestPrice,
    },
    { label: 'Released', get: (g) => g.release_date || '—' },
  ]

  return (
    <div>
      <Link
        to="/"
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-4 transition rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage-400"
      >
        <ArrowLeft size={15} /> Back to Catalog
      </Link>

      <div className="flex items-center justify-between flex-wrap gap-3 mb-1">
        <h1 className="font-display text-xl sm:text-2xl font-medium text-gray-900 tracking-tight">
          Comparing {gadgets.length} Gadgets
        </h1>
        <button
          onClick={handleShare}
          disabled={sharing}
          className="flex items-center gap-1.5 text-xs font-medium text-sage-700 border border-sage-200 rounded-md px-3 py-1.5 hover:bg-sage-50 active:scale-95 disabled:opacity-50 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage-400"
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
          <thead>
            <tr>
              <th className="w-28"></th>
              {gadgets.map((g) => (
                <th key={g.id} className="text-left align-top pb-3 px-2">
                  <div className="relative bg-white border border-gray-200 rounded-xl p-3">
                    <button
                      onClick={() => removeGadget(g.id)}
                      aria-label={`Remove ${g.name} from comparison`}
                      className="absolute top-2 right-2 text-slate-500 hover:text-red-700 transition rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
                    >
                      <X size={15} />
                    </button>
                    <div className="h-20 w-full bg-gray-50 rounded-lg overflow-hidden mb-2 flex items-center justify-center">
                      {g.image_url ? (
                        <img src={g.image_url} alt={g.name} className="h-full w-full object-cover" />
                      ) : (
                        <ImageOff size={18} className="text-gray-300" />
                      )}
                    </div>
                    <Link
                      to={`/gadgets/${g.id}`}
                      className="font-semibold text-sm text-gray-900 hover:underline block rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage-400"
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
                <td className="text-xs font-medium text-gray-500 py-3 pr-2">{row.label}</td>
                {gadgets.map((g) => {
                  const isHighlighted = row.highlight?.(g)
                  return (
                    <td key={g.id} className="py-3 px-2 text-sm text-gray-800">
                      <span
                        className={
                          isHighlighted
                            ? 'inline-flex items-center gap-1 text-green-700 font-medium bg-green-50 rounded-full px-2 py-0.5'
                            : ''
                        }
                      >
                        {isHighlighted && <Trophy size={11} />}
                        {row.get(g)}
                      </span>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile: stacked cards, one per gadget */}
      <div className="sm:hidden space-y-4">
        {gadgets.map((g) => (
          <div key={g.id} className="relative bg-white border border-gray-200 rounded-xl p-4">
            <button
              onClick={() => removeGadget(g.id)}
              aria-label={`Remove ${g.name} from comparison`}
              className="absolute top-3 right-3 text-slate-500 hover:text-red-700 transition rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
            >
              <X size={16} />
            </button>
            <div className="flex items-center gap-3 mb-3">
              <div className="h-14 w-14 shrink-0 bg-gray-50 rounded-lg overflow-hidden flex items-center justify-center">
                {g.image_url ? (
                  <img src={g.image_url} alt={g.name} className="h-full w-full object-cover" />
                ) : (
                  <ImageOff size={18} className="text-gray-300" />
                )}
              </div>
              <Link
                to={`/gadgets/${g.id}`}
                className="font-semibold text-gray-900 hover:underline rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage-400"
              >
                {g.name}
              </Link>
            </div>
            <dl className="divide-y divide-gray-100">
              {rows.map((row) => {
                const isHighlighted = row.highlight?.(g)
                return (
                  <div key={row.label} className="flex items-center justify-between py-2">
                    <dt className="text-xs font-medium text-gray-500">{row.label}</dt>
                    <dd
                      className={
                        isHighlighted
                          ? 'inline-flex items-center gap-1 text-green-700 font-medium bg-green-50 rounded-full px-2 py-0.5 text-sm'
                          : 'text-sm text-gray-800'
                      }
                    >
                      {isHighlighted && <Trophy size={11} />}
                      {row.get(g)}
                    </dd>
                  </div>
                )
              })}
            </dl>
          </div>
        ))}
      </div>

      <AIComparisonPanel gadgetIds={gadgets.map((g) => g.id)} gadgetNames={gadgets.map((g) => g.name)} />
    </div>
  )
}