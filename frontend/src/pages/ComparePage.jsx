import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useSearchParams, useNavigate } from 'react-router-dom'
import { X, Sparkles, Trophy, Share2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { api } from '../api/client'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import EmptyState from '../components/EmptyState'
import ErrorState from '../components/ui/ErrorState'
import BackLink from '../components/ui/BackLink'
import Button from '../components/ui/Button'
import AIComparisonPanel from '../components/AIComparisonPanel'
import CompareAddGadget from '../components/CompareAddGadget'
import PhoneGlyph from '../components/PhoneGlyph'
import PriceTag from '../components/PriceTag'
import { friendlyError } from '../utils/requestErrors'
import { formatPeso } from '../utils/formatPeso'
import { extractKeySpecs } from '../utils/keySpecs'

// Matches the backend's MAX_COMPARISON_GADGETS (routers/comparisons.py).
const MAX_COMPARE_GADGETS = 5
const NOT_STATED = 'Not stated by source'

// Card and bar colour per position (theme tokens): 1st = accent (lime / cobalt),
// 2nd = cobalt in dark / ink in light, then pale lime, surface, inverse.
const SLOT_STYLES = [
  { card: 'bg-sage-700 text-white', bar: 'bg-sage-700', ring: 'border-current/40' },
  { card: 'bg-vs2 text-vs2-ink', bar: 'bg-vs2', ring: 'border-current/40' },
  { card: 'bg-pop text-pop-ink', bar: 'bg-pop', ring: 'border-current/40' },
  { card: 'bg-white text-slate-900 border border-slate-200', bar: 'bg-slate-500', ring: 'border-slate-300' },
  { card: 'bg-inverse text-inverse-ink', bar: 'bg-inverse', ring: 'border-current/40' },
]

// Cards get a round cut-out around the centred VS badge from the sm breakpoint up
// (.vs-notch-left/right in index.css); stacked on a phone they stay whole.
// The × button sits 32 px in from that edge so the cut-out never clips it.
const NOTCH_LEFT = 'vs-notch-left'
const NOTCH_RIGHT = 'vs-notch-right'

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
  if (!date) return null
  const d = new Date(date)
  return Number.isNaN(d.getTime()) ? date : d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' })
}

/** Largest number in a key-spec value ("128–512" → 512, "256 GB–1 TB" → 1024), for bar lengths. */
function magnitude(found) {
  if (!found) return null
  const parts = [...found.value.matchAll(/(\d+(?:\.\d+)?)\s*(TB)?/gi)].map((m) => Number(m[1]) * (m[2] ? 1024 : 1))
  return parts.length ? Math.max(...parts) : null
}

function keyRow(id, label, keySpecsList) {
  return {
    label,
    key: true,
    cells: keySpecsList.map((k) => {
      if (k === undefined) return { text: '…', missing: true, n: null, source: null }
      const found = k?.[id]
      if (!found) return { text: NOT_STATED, missing: true, n: null, source: null }
      return { text: `${found.value}${found.unit ? ` ${found.unit}` : ''}`, missing: false, n: magnitude(found), source: [found.source, found.variants && 'base model'].filter(Boolean).join(' · ') || null }
    }),
  }
}

function plainRow(label, gadgets, get, { missingText = 'Not listed', source = 'catalog' } = {}) {
  return {
    label,
    cells: gadgets.map((g) => {
      const value = get(g)
      return value == null ? { text: missingText, missing: true, n: null, source: null } : { text: value, missing: false, n: null, source }
    }),
  }
}

/** Bar fill per cell: proportional where every phone states a number, full when stated, empty when not. */
function barWidths(row) {
  const nums = row.cells.map((c) => c.n)
  const allNumeric = nums.every((n) => n != null && n > 0)
  const max = allNumeric ? Math.max(...nums) : null
  return row.cells.map((c) => {
    if (c.missing) return 0
    return allNumeric ? Math.round((c.n / max) * 100) : 100
  })
}

function GadgetPicture({ gadget, className }) {
  const [failedSrc, setFailedSrc] = useState(null)
  if (!gadget.image_url || failedSrc === gadget.image_url) return <PhoneGlyph className={className} />
  return <img src={gadget.image_url} alt="" className="h-full w-full object-cover" onError={() => setFailedSrc(gadget.image_url)} />
}

function PhoneCard({ gadget, index, onRemove, side, notch }) {
  const style = SLOT_STYLES[index % SLOT_STYLES.length]
  const right = side === 'right'
  const price = formatPeso(gadget.price_php)
  return (
    <section
      aria-label={gadget.name}
      className={`${notch ?? ''} relative flex items-center gap-4 sm:gap-5 p-4 sm:p-5 rounded-[26px] min-w-0 ${style.card} ${
        right ? 'flex-row-reverse text-right sm:pl-20' : notch ? 'sm:pr-20' : ''
      }`}
    >
      <div className="shrink-0 w-16 h-24 sm:w-20 sm:h-28 rounded-2xl bg-black/10 overflow-hidden flex items-center justify-center">
        <GadgetPicture gadget={gadget} className="w-10 h-16 sm:w-12 sm:h-20" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-mono text-[11px] font-semibold opacity-85 uppercase truncate">{gadget.brand}</p>
        <h2 className="mt-1 text-2xl sm:text-3xl font-extrabold tracking-[-0.04em] leading-none break-words">
          <Link to={`/gadgets/${gadget.id}`} className="hover:underline rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current">
            {gadget.name}
          </Link>
        </h2>
        <p className={`mt-2 font-mono ${price ? 'text-lg sm:text-xl' : 'text-sm opacity-85'}`}><PriceTag gadget={gadget} empty="No price listed" sourceClassName="opacity-85" /></p>
      </div>
      <button
        type="button"
        onClick={() => onRemove(gadget.id)}
        aria-label={`Remove ${gadget.name} from comparison`}
        className={`absolute top-3 ${right ? (notch ? 'left-3 sm:left-8' : 'left-3') : notch ? 'right-3 sm:right-8' : 'right-3'} w-10 h-10 rounded-full border border-current/40 flex items-center justify-center hover:bg-black/10 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current`}
      >
        <X size={18} aria-hidden="true" />
      </button>
    </section>
  )
}

function VersusHeader({ gadgets, onRemove, addSlot }) {
  if (gadgets.length === 2) {
    return (
      <div className="relative grid grid-cols-1 sm:grid-cols-2 gap-3">
        <PhoneCard gadget={gadgets[0]} index={0} onRemove={onRemove} notch={NOTCH_LEFT} />
        <span aria-hidden="true" className="sm:hidden mx-auto -my-5 z-10 w-12 h-12 rounded-full bg-inverse text-inverse-ink ring-4 ring-slate-50 flex items-center justify-center text-base font-extrabold">
          VS
        </span>
        <PhoneCard gadget={gadgets[1]} index={1} onRemove={onRemove} side="right" notch={NOTCH_RIGHT} />
        <span
          aria-hidden="true"
          className="hidden sm:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[88px] h-[88px] rounded-full bg-inverse text-inverse-ink items-center justify-center text-3xl font-extrabold tracking-[-0.04em]"
        >
          VS
        </span>
      </div>
    )
  }
  if (gadgets.length === 1) {
    return (
      <div className="relative grid grid-cols-1 sm:grid-cols-2 gap-3">
        <PhoneCard gadget={gadgets[0]} index={0} onRemove={onRemove} />
        <div className="flex flex-col items-center justify-center gap-3 min-h-40 p-5 rounded-[26px] border-2 border-dashed border-slate-300 text-center">
          <p className="text-base font-bold text-slate-900">Add a phone to compare</p>
          {addSlot}
        </div>
      </div>
    )
  }
  return (
    <div className="grid grid-cols-1 sm:grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-3">
      {gadgets.map((g, i) => (
        <PhoneCard key={g.id} gadget={g} index={i} onRemove={onRemove} />
      ))}
    </div>
  )
}

function FaceOff({ gadgets, rows }) {
  const [a, b] = gadgets
  return (
    <div className="px-4 sm:px-5 pb-2">
      {rows.map((row) => {
        const [wa, wb] = barWidths(row)
        const [ca, cb] = row.cells
        return (
          <div
            key={row.label}
            className={`grid grid-cols-[minmax(0,1fr)_88px_minmax(0,1fr)] sm:grid-cols-[minmax(0,1fr)_132px_minmax(0,1fr)] items-center gap-3 py-3.5 border-t border-slate-200 ${
              row.key ? 'bg-sage-50 -mx-4 sm:-mx-5 px-4 sm:px-5' : ''
            }`}
          >
            <div className="min-w-0">
              <p className={`text-[15px] ${ca.missing ? 'italic text-slate-500' : 'font-bold text-slate-900'}`}>
                <span className="sr-only">{a.name}: </span>
                {ca.text}
              </p>
              <div className="mt-1.5 h-1.5 rounded-full bg-slate-200 overflow-hidden">
                <div className={`h-full rounded-full ${SLOT_STYLES[0].bar}`} style={{ width: `${wa}%` }} />
              </div>
              <p className="mt-1 font-mono text-[11px] text-slate-500 truncate">{ca.source ?? '—'}</p>
            </div>
            <p className={`text-center font-mono text-[11px] font-semibold uppercase tracking-wider ${row.key ? 'text-sage-700' : 'text-slate-500'}`}>
              {row.label}
            </p>
            <div className="min-w-0 text-right">
              <p className={`text-[15px] ${cb.missing ? 'italic text-slate-500' : 'font-bold text-slate-900'}`}>
                <span className="sr-only">{b.name}: </span>
                {cb.text}
              </p>
              <div className="mt-1.5 h-1.5 rounded-full bg-slate-200 overflow-hidden flex justify-end">
                <div className={`h-full rounded-full ${SLOT_STYLES[1].bar}`} style={{ width: `${wb}%` }} />
              </div>
              <p className="mt-1 font-mono text-[11px] text-slate-500 truncate">{cb.source ?? '—'}</p>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function CellValue({ cell, lowest }) {
  if (cell.missing) return <span className="italic text-slate-500">{cell.text}</span>
  if (!lowest) return cell.text
  return (
    <span className="inline-flex flex-col items-start gap-0.5">
      <span className="inline-flex items-center gap-1 text-green-800 font-semibold bg-green-50 rounded-full px-2 py-0.5">
        <Trophy size={11} aria-hidden="true" />
        {cell.text}
      </span>
      <span className="text-xs font-semibold text-green-800">Lowest price</span>
    </span>
  )
}

function SpecTable({ gadgets, rows, cheapestPrice }) {
  return (
    <div className="overflow-x-auto">
      {/* table-fixed: gadget columns share the width equally instead of the longest name widening its column (#156). */}
      <table className="w-full table-fixed border-collapse min-w-[520px] text-[15px]">
        <caption className="sr-only">Spec comparison of {gadgets.map((g) => g.name).join(', ')}</caption>
        <thead>
          <tr>
            <th scope="col" className="w-36 text-left text-xs font-semibold text-slate-500 px-4 sm:px-5 py-3">
              Spec
            </th>
            {gadgets.map((g) => (
              <th key={g.id} scope="col" className="text-left text-xs font-semibold text-slate-500 px-3 py-3 break-words">
                {g.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label} className={`border-t border-slate-200 ${row.key ? 'bg-sage-50' : ''}`}>
              <th scope="row" className="text-left font-bold text-slate-900 px-4 sm:px-5 py-3">
                {row.label}
              </th>
              {row.cells.map((cell, i) => (
                <td key={gadgets[i].id} className="px-3 py-3 text-slate-900 break-words">
                  <CellValue cell={cell} lowest={row.label === 'Price' && cheapestPrice != null && gadgets[i].price_php === cheapestPrice} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function ComparePage() {
  useDocumentTitle('Compare')
  const [searchParams, setSearchParams] = useSearchParams()
  // Opened from My Gadgets? Then "back" returns there instead of to the catalog.
  const location = useLocation()
  const fromMyGadgets = location.state?.from === '/my-gadgets'
  const back = fromMyGadgets ? { to: '/my-gadgets', label: 'Back to My Gadgets' } : { to: '/', label: 'Back to Catalog' }
  const navigate = useNavigate()
  const ids = useMemo(() => parseIds(searchParams.get('ids')), [searchParams])

  const [gadgets, setGadgets] = useState([])
  const [loading, setLoading] = useState(ids.length > 0)
  const [sharing, setSharing] = useState(false)
  const [loadError, setLoadError] = useState(null)
  const [attempt, setAttempt] = useState(0)
  const [view, setView] = useState('faceoff')
  // Key specs per gadget id: undefined = loading, null = couldn't load, object = parsed.
  const [keySpecsById, setKeySpecsById] = useState({})
  // The link belongs to one exact set of gadgets; changing the set makes it stale.
  const idsKey = ids.join(',')
  const [share, setShare] = useState(null)
  const shareUrl = share?.key === idsKey ? share.url : null
  // After an add the page swaps to its loading skeleton, so focus would fall to <body>.
  // Once it has reloaded, put focus back on Add Gadget (or the heading at the 5-gadget limit).
  const focusAfterAdd = useRef(false)
  const addButtonRef = useRef(null)
  const headingRef = useRef(null)
  useEffect(() => {
    if (loading || !focusAfterAdd.current) return
    focusAfterAdd.current = false
    ;(addButtonRef.current ?? headingRef.current)?.focus()
  }, [loading])

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
          toast.error('One phone could not be loaded — it may have been deleted', { id: 'gadget-missing' })
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

  // Key specs come from each phone's saved, sourced spec text (same parser as the catalog tiles).
  useEffect(() => {
    if (typeof api.getSpecs !== 'function') return undefined
    let cancelled = false
    for (const g of gadgets) {
      api
        .getSpecs(g.id)
        .then((specs) => !cancelled && setKeySpecsById((prev) => ({ ...prev, [g.id]: extractKeySpecs(specs) })))
        .catch(() => !cancelled && setKeySpecsById((prev) => ({ ...prev, [g.id]: null })))
    }
    return () => {
      cancelled = true
    }
  }, [gadgets])

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
      // Keep the router state, so removing a gadget doesn't lose where the user came from.
      setSearchParams({ ids: next.join(',') }, { state: location.state })
    }
  }

  // #203: add one more gadget without leaving the page. Same ?ids= update as removing,
  // so the share link and the AI panel follow the new set; the toast is announced.
  function addGadget(gadget) {
    if (ids.includes(gadget.id) || ids.length >= MAX_COMPARE_GADGETS) return
    focusAfterAdd.current = true
    setSearchParams({ ids: [...ids, gadget.id].join(',') }, { state: location.state })
    toast.success(`${gadget.name} added to the comparison`)
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" role="status" aria-label="Loading comparison">
        {[1, 2].map((i) => (
          <div key={i} className="h-40 bg-slate-100 rounded-[26px] animate-pulse" />
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

  if (ids.length === 0 || gadgets.length === 0) {
    return (
      <EmptyState
        icon={Sparkles}
        title="Pick at Least 2 Phones to Compare"
        description={fromMyGadgets ? 'Head back to My Gadgets, select 2–5 phones, then choose Compare & Ask AI.' : 'Head back to the catalog, tick Compare on 2–3 phones, then hit Compare now.'}
        action={
          <Button as={Link} to={back.to} variant="primary">
            {back.label}
          </Button>
        }
      />
    )
  }

  const addControl =
    ids.length < MAX_COMPARE_GADGETS ? (
      <CompareAddGadget excludeIds={ids} onAdd={addGadget} buttonRef={addButtonRef} />
    ) : (
      <p className="text-sm text-slate-600">
        {MAX_COMPARE_GADGETS} gadgets is the most you can compare. Remove one (×) to add another.
      </p>
    )

  const comparing = gadgets.length >= 2
  const cheapestPrice = strictlyLowestPrice(gadgets)
  const keySpecsList = gadgets.map((g) => keySpecsById[g.id])
  const rows = [
    keyRow('ram', 'RAM', keySpecsList),
    keyRow('storage', 'Storage', keySpecsList),
    keyRow('camera', 'Main camera', keySpecsList),
    keyRow('refresh', 'Display', keySpecsList),
    plainRow('Price', gadgets, (g) => formatPeso(g.price_php)),
    plainRow('Released', gadgets, (g) => formatDate(g.release_date)),
    plainRow('Brand', gadgets, (g) => g.brand),
  ]
  const showFaceOff = gadgets.length === 2 && view === 'faceoff'

  return (
    <div className="flex flex-col gap-4">
      <BackLink to={back.to}>{back.label}</BackLink>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 ref={headingRef} tabIndex={-1} className="text-4xl font-extrabold tracking-[-0.05em] text-slate-900 focus:outline-none">
            Comparing {gadgets.length} {gadgets.length === 1 ? 'Gadget' : 'Gadgets'}
          </h1>
          <p className="mt-1 text-sm text-slate-600">Side by side from official sources. Gaps are shown, never filled in.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {comparing && addControl}
          {comparing && (
            <Button variant="primary" icon={Share2} onClick={handleShare} loading={sharing}>
              {sharing ? 'Creating Link…' : 'Share'}
            </Button>
          )}
        </div>
      </div>

      {shareUrl && (
        <div className="flex items-center gap-2">
          <label htmlFor="share-url" className="text-xs font-semibold text-slate-600 shrink-0">
            Share Link
          </label>
          <input
            id="share-url"
            readOnly
            value={shareUrl}
            onFocus={(e) => e.target.select()}
            className="flex-1 min-w-0 text-sm text-slate-800 bg-white border border-slate-200 rounded-full px-4 py-2"
          />
        </div>
      )}

      <VersusHeader gadgets={gadgets} onRemove={removeGadget} addSlot={addControl} />

      {comparing && (
        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] gap-3.5 items-start">
          <section aria-labelledby="specs-heading" className="min-w-0 bg-white border border-slate-200 rounded-[26px]">
            <div className="flex flex-wrap items-center justify-between gap-2 px-4 sm:px-5 pt-4 pb-2">
              <h2 id="specs-heading" className="text-xl font-extrabold tracking-[-0.03em] text-slate-900">
                Specs
              </h2>
              {gadgets.length === 2 && (
                <div role="group" aria-label="Spec view" className="flex gap-1 p-1 rounded-full bg-slate-100">
                  {[
                    ['faceoff', 'Face-off'],
                    ['table', 'Table'],
                  ].map(([id, label]) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setView(id)}
                      aria-pressed={view === id}
                      className={`px-4 min-h-9 rounded-full text-sm font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage-600 ${
                        view === id ? 'bg-inverse text-inverse-ink' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {showFaceOff ? <FaceOff gadgets={gadgets} rows={rows} /> : <SpecTable gadgets={gadgets} rows={rows} cheapestPrice={cheapestPrice} />}
            <p className="px-4 sm:px-5 py-3 text-xs text-slate-500 border-t border-slate-200">
              Highlighted rows are the four key specs, read from each phone&apos;s saved sources.
              {showFaceOff ? ' Bars compare numbers only where both sources state them.' : ''}
            </p>
          </section>

          <AIComparisonPanel
            gadgetIds={gadgets.map((g) => g.id)}
            gadgetNames={gadgets.map((g) => g.name)}
            category={gadgets.map((g) => g.category)}
          />
        </div>
      )}
    </div>
  )
}
