import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { LayoutDashboard, ArrowRight, Scale, Trash2, Sparkles } from 'lucide-react'
import toast from 'react-hot-toast'
import { api } from '../api/client'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import EmptyState from '../components/EmptyState'
import ErrorState from '../components/ui/ErrorState'
import Button from '../components/ui/Button'
import ProductImage from '../components/ProductImage'
import { friendlyError } from '../utils/requestErrors'

// Same bounds as the Compare page and the backend (MAX_COMPARISON_GADGETS).
const MIN_COMPARE = 2
const MAX_COMPARE = 5

const focusRing = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage-600'

function formatPrice(value) {
  return `Php ${Number(value).toLocaleString('en-PH', { maximumFractionDigits: 0 })}`
}

/**
 * My Gadgets (S5-IK, 3 Nov 2026): a signed-in user's own dashboard. It starts empty;
 * gadgets are added from the catalog cards ("Add to My Gadgets"). From here the user
 * opens a gadget (its page has Ask AI), removes it, or picks 2–5 to compare and ask
 * the AI across them on the existing Compare page.
 */
export default function MyGadgets() {
  useDocumentTitle('My Gadgets')
  const navigate = useNavigate()
  const [state, setState] = useState({ status: 'loading', items: [], error: null })
  const [selected, setSelected] = useState(() => new Set())
  const [removingId, setRemovingId] = useState(null)

  const load = useCallback(() => {
    setState((s) => ({ ...s, status: 'loading', error: null }))
    api
      .getMyGadgets()
      .then((items) => setState({ status: 'ready', items, error: null }))
      .catch((err) => setState({ status: 'error', items: [], error: friendlyError(err) }))
  }, [])

  // Same fetch-in-effect convention as the rest of the app (see CLAUDE.md, "Lint conventions").
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => load(), [load])

  function toggle(id) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else if (next.size < MAX_COMPARE) next.add(id)
      else toast.error(`Compare up to ${MAX_COMPARE} gadgets at a time.`)
      return next
    })
  }

  async function remove(gadget) {
    setRemovingId(gadget.id)
    try {
      await api.removeMyGadget(gadget.id)
      setState((s) => ({ ...s, items: s.items.filter((item) => item.gadget.id !== gadget.id) }))
      setSelected((prev) => {
        const next = new Set(prev)
        next.delete(gadget.id)
        return next
      })
      toast.success(`Removed ${gadget.name} from My Gadgets`)
    } catch (err) {
      toast.error(friendlyError(err))
    } finally {
      setRemovingId(null)
    }
  }

  const header = (
    <>
      <h1 className="text-4xl font-extrabold tracking-[-0.05em] text-slate-900 mb-1 flex items-center gap-2.5">
        <LayoutDashboard size={22} className="text-sage-700" aria-hidden="true" /> My Gadgets
      </h1>
      <p className="text-sm text-gray-600 mb-6">
        Your own shortlist from the TekaTech catalog. Open a gadget to ask the AI about it, or select {MIN_COMPARE}–
        {MAX_COMPARE} to compare them and ask the AI across them.
      </p>
    </>
  )

  if (state.status === 'loading') {
    return (
      <div>
        {header}
        <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,20rem),1fr))] gap-4" role="status" aria-label="Loading your gadgets">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-40 rounded-3xl bg-white border border-slate-200 animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (state.status === 'error') {
    return (
      <div className="max-w-2xl mx-auto">
        {header}
        <ErrorState title="Couldn't Load Your Gadgets" message={state.error} onRetry={load} />
      </div>
    )
  }

  const { items } = state
  const canCompare = selected.size >= MIN_COMPARE

  return (
    <div className={selected.size > 0 ? 'pb-24' : ''}>
      {header}

      {items.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl">
          <EmptyState
            icon={LayoutDashboard}
            title="Your Dashboard Is Empty"
            description="Browse the catalog and choose Add to My Gadgets on the devices you're interested in. They'll appear here."
            action={
              <Button as={Link} to="/" variant="primary">
                Browse the Catalog <ArrowRight size={16} aria-hidden="true" />
              </Button>
            }
          />
        </div>
      ) : (
        <>
          <p className="text-sm text-slate-600 mb-3" aria-live="polite">
            {items.length} gadget{items.length === 1 ? '' : 's'}
            {selected.size > 0 && ` · ${selected.size} selected`}
          </p>
          <ul className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,20rem),1fr))] gap-4">
            {items.map(({ gadget }) => (
              <MyGadgetCard
                key={gadget.id}
                gadget={gadget}
                selected={selected.has(gadget.id)}
                removing={removingId === gadget.id}
                onToggle={() => toggle(gadget.id)}
                onRemove={() => remove(gadget)}
              />
            ))}
          </ul>
          <p className="text-sm mt-6">
            <Link to="/" className={`font-medium text-sage-700 hover:underline rounded ${focusRing}`}>
              Add more from the catalog
            </Link>
          </p>
        </>
      )}

      {selected.size > 0 && (
        <aside
          aria-label="Compare selected gadgets"
          className="fixed bottom-0 inset-x-0 z-20 bg-white/95 backdrop-blur border-t border-slate-200 shadow-lg"
        >
          <div className="max-w-[1320px] mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3">
            <span className="text-sm text-slate-700">
              {canCompare
                ? `${selected.size} selected`
                : `Select at least ${MIN_COMPARE} gadgets to compare`}
            </span>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => setSelected(new Set())}>
                Clear
              </Button>
              <Button
                variant="primary"
                size="sm"
                icon={Scale}
                disabled={!canCompare}
                onClick={() => navigate(`/compare?ids=${[...selected].join(',')}`, { state: { from: '/my-gadgets' } })}
              >
                Compare &amp; Ask AI
              </Button>
            </div>
          </div>
        </aside>
      )}
    </div>
  )
}

function MyGadgetCard({ gadget, selected, removing, onToggle, onRemove }) {
  return (
    <li
      className={`bg-white rounded-xl p-5 border shadow-xs flex flex-col gap-4 ${
        selected ? 'border-sage-400 ring-1 ring-sage-400' : 'border-slate-200'
      }`}
    >
      <div className="flex gap-4">
        <ProductImage src={gadget.image_url} className="w-16 aspect-square shrink-0 !rounded-lg" glyphClassName="w-1/2 h-3/4" padding="p-1.5" />
        <div className="min-w-0 flex flex-col justify-center">
          <span className="font-mono text-xs text-slate-600">{gadget.category}</span>
          <h2 className="text-lg font-bold text-slate-900 truncate">
            <Link to={`/gadgets/${gadget.id}`} className={`hover:underline rounded ${focusRing}`}>
              {gadget.name}
            </Link>
          </h2>
          <span className="text-sm text-slate-600 truncate">
            {gadget.brand}
            {gadget.price_php != null && ` · ${formatPrice(gadget.price_php)}`}
          </span>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-200">
        <label className="flex items-center gap-2 min-h-9 cursor-pointer select-none rounded-md focus-within:ring-2 focus-within:ring-sage-600 px-1 -mx-1">
          <input
            type="checkbox"
            checked={selected}
            onChange={onToggle}
            aria-label={`Select ${gadget.name} to compare`}
            className="w-5 h-5 rounded border-slate-300 accent-sage-700 focus:outline-none"
          />
          <span className="text-sm text-slate-800 font-semibold" aria-hidden="true">
            Select
          </span>
        </label>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" icon={Trash2} loading={removing} disabled={removing} onClick={onRemove} aria-label={`Remove ${gadget.name} from My Gadgets`}>
            Remove
          </Button>
          <Button as={Link} to={`/gadgets/${gadget.id}`} variant="subtle" size="sm" icon={Sparkles} aria-label={`Ask AI about ${gadget.name}`}>
            Ask AI
          </Button>
        </div>
      </div>
    </li>
  )
}
