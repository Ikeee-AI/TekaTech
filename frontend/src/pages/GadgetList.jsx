import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import {
  Sparkles,
  SlidersHorizontal,
  RotateCcw,
  ChevronDown,
  X,
  ArrowRight,
  Scale,
  PackagePlus,
  SearchX,
  ImageOff,
  BookmarkPlus,
  BookmarkCheck,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { api } from '../api/client'
import EmptyState from '../components/EmptyState'
import ErrorState from '../components/ui/ErrorState'
import { CatalogSkeleton } from '../components/Skeleton'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { useAuth } from '../hooks/useAuth'
import AIAnswerPanel from '../components/AIAnswerPanel'
import TrendingQuestions from '../components/TrendingQuestions'
import { friendlyError } from '../utils/requestErrors'
import { formatPeso } from '../utils/formatPeso'
import { categoryLine, compareLine } from '../utils/lineColors'

const SUGGESTED_QUESTIONS = [
  'Which gadget has the best battery life?',
  'What phones support fast charging?',
  'Compare display quality across gadgets',
]

const PAGE_SIZE = 12
const HISTOGRAM_BINS = 11

const focusRing = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rail-600'
// Controls on the navy compare tray: the navy ring would vanish there.
const trayFocusRing = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-line-yellow'
// Widens a small icon button's touch area to about 40px without changing its look.
const hitArea = "relative before:absolute before:-inset-2.5 before:content-['']"

function formatPrice(value) {
  return formatPeso(value)
}

function formatRelease(date) {
  if (!date) return null
  const d = new Date(date)
  if (Number.isNaN(d.getTime())) return null
  // release_date is a plain date ('2025-03-12'), read as midnight UTC: format in UTC so it
  // doesn't show a day early west of UTC. Same as ComparePage (#98).
  return d.toLocaleDateString(undefined, { month: 'short', year: 'numeric', timeZone: 'UTC' })
}

function countBy(list, key) {
  const counts = new Map()
  for (const item of list) counts.set(item[key], (counts.get(item[key]) ?? 0) + 1)
  return [...counts.entries()].sort((a, b) => a[0].localeCompare(b[0]))
}

// Gadgets without a price sort last in both directions, not first as ₱0.
function comparePrices(a, b, direction) {
  const aMissing = a.price_php == null
  const bMissing = b.price_php == null
  if (aMissing || bMissing) return aMissing === bMissing ? 0 : aMissing ? 1 : -1
  return (a.price_php - b.price_php) * direction
}

function toggleInSet(set, value) {
  const next = new Set(set)
  if (next.has(value)) next.delete(value)
  else next.add(value)
  return next
}

export default function GadgetList() {
  useDocumentTitle('Catalog')
  const { user } = useAuth()
  const isAdmin = Boolean(user?.app_metadata?.is_admin)
  const [gadgets, setGadgets] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  // Search text and the AI question live in the URL so the navbar search bar can set them.
  const [searchParams, setSearchParams] = useSearchParams()
  const query = searchParams.get('q') ?? ''
  const askedQuestion = searchParams.get('ask')
  const [categories, setCategories] = useState(new Set())
  const [brands, setBrands] = useState(new Set())
  const [maxPrice, setMaxPrice] = useState(null)
  const [sortBy, setSortBy] = useState('name')
  const [page, setPage] = useState(1)
  const [lastQuery, setLastQuery] = useState(query)

  // Typing a new search goes back to the first page of results.
  if (lastQuery !== query) {
    setLastQuery(query)
    setPage(1)
  }
  const [selected, setSelected] = useState(new Set())
  const [filtersOpen, setFiltersOpen] = useState(false)
  const navigate = useNavigate()
  const topRef = useRef(null)

  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    api.getGadgets().then(setGadgets).catch((err) => setError(friendlyError(err))).finally(() => setLoading(false))
  }, [attempt])

  function retryLoad() {
    setLoading(true)
    setError(null)
    setAttempt((n) => n + 1)
  }

  // My Gadgets: which catalog gadgets the signed-in user has on their dashboard.
  // null = not loaded (or signed out); the card buttons wait for it before showing a state.
  const location = useLocation()
  const [myIds, setMyIds] = useState(null)
  const [savingId, setSavingId] = useState(null)
  const userId = user?.id ?? null

  useEffect(() => {
    if (!userId) return
    let cancelled = false
    api
      .getMyGadgets()
      .then((items) => !cancelled && setMyIds(new Set(items.map((item) => item.gadget.id))))
      // The catalog still works without it; the buttons just stay hidden.
      .catch(() => !cancelled && setMyIds(null))
    return () => {
      cancelled = true
    }
  }, [userId])

  async function toggleMine(gadget) {
    if (!user) {
      navigate('/login', { state: { from: location } })
      return
    }
    const inList = myIds?.has(gadget.id)
    setSavingId(gadget.id)
    try {
      if (inList) await api.removeMyGadget(gadget.id)
      else await api.addMyGadget(gadget.id)
      setMyIds((prev) => {
        const next = new Set(prev ?? [])
        if (inList) next.delete(gadget.id)
        else next.add(gadget.id)
        return next
      })
      toast.success(
        inList ? (
          `Removed ${gadget.name} from My Gadgets`
        ) : (
          <span>
            Added {gadget.name} to{' '}
            <Link to="/my-gadgets" className="font-semibold underline">
              My Gadgets
            </Link>
          </span>
        ),
      )
    } catch (err) {
      toast.error(friendlyError(err))
    } finally {
      setSavingId(null)
    }
  }

  const categoryCounts = useMemo(() => countBy(gadgets, 'category'), [gadgets])
  const brandCounts = useMemo(() => countBy(gadgets, 'brand'), [gadgets])

  const priceStats = useMemo(() => {
    const prices = gadgets.map((g) => g.price_php).filter((p) => p != null)
    if (prices.length === 0) return null
    const min = Math.min(...prices)
    const max = Math.max(...prices)
    const bins = Array(HISTOGRAM_BINS).fill(0)
    for (const p of prices) {
      const i = max === min ? 0 : Math.min(HISTOGRAM_BINS - 1, Math.floor(((p - min) / (max - min)) * HISTOGRAM_BINS))
      bins[i] += 1
    }
    return { min, max, bins, peak: Math.max(...bins) }
  }, [gadgets])

  // The slider moves in steps counted from the lowest price, so its top stop can fall just short of
  // the highest price (14,999 + 100 × 300 = 44,999 when the top is 45,000). The last stop therefore
  // means "no price limit"; otherwise the far right would still hide the most expensive gadget.
  const priceStep = priceStats ? Math.max(1, Math.round((priceStats.max - priceStats.min) / 100)) : 1
  function setPriceFromSlider(value) {
    updateFilter(setMaxPrice)(value + priceStep > priceStats.max ? null : value)
  }

  const priceLimit = maxPrice ?? priceStats?.max ?? null
  const priceFilterActive = priceStats && maxPrice != null && maxPrice < priceStats.max

  const filtered = useMemo(() => {
    const q = query.toLowerCase()
    let list = gadgets.filter((g) => {
      if (categories.size > 0 && !categories.has(g.category)) return false
      if (brands.size > 0 && !brands.has(g.brand)) return false
      if (priceFilterActive && (g.price_php == null || g.price_php > maxPrice)) return false
      return g.name.toLowerCase().includes(q) || g.brand.toLowerCase().includes(q)
    })
    if (sortBy === 'price-low') list = [...list].sort((a, b) => comparePrices(a, b, 1))
    else if (sortBy === 'price-high') list = [...list].sort((a, b) => comparePrices(a, b, -1))
    else if (sortBy === 'newest') list = [...list].sort((a, b) => (b.release_date ?? '').localeCompare(a.release_date ?? ''))
    else list = [...list].sort((a, b) => a.name.localeCompare(b.name))
    return list
  }, [gadgets, query, categories, brands, priceFilterActive, maxPrice, sortBy])

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, pageCount)
  const pageStart = (currentPage - 1) * PAGE_SIZE
  const pageItems = filtered.slice(pageStart, pageStart + PAGE_SIZE)

  const selectedGadgets = useMemo(
    () => [...selected].map((id) => gadgets.find((g) => g.id === id)).filter(Boolean),
    [selected, gadgets],
  )

  const hasFilters = query || categories.size > 0 || brands.size > 0 || priceFilterActive

  function toggleSelect(id) {
    setSelected((prev) => {
      if (!prev.has(id) && prev.size >= 3) {
        toast.error('You can compare up to 3 gadgets at a time')
        return prev
      }
      return toggleInSet(prev, id)
    })
  }

  function updateFilter(setter) {
    return (value) => {
      setter(value)
      setPage(1)
    }
  }

  function setQuery(value) {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      if (value) next.set('q', value)
      else next.delete('q')
      return next
    }, { replace: true })
  }

  function setAskedQuestion(question) {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      if (question) next.set('ask', question)
      else next.delete('ask')
      return next
    })
  }

  function clearFilters() {
    setQuery('')
    setCategories(new Set())
    setBrands(new Set())
    setMaxPrice(null)
    setPage(1)
  }

  function ask(question) {
    setAskedQuestion(question)
    topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  if (loading) return <CatalogSkeleton />
  if (error) {
    return (
      <div className="max-w-2xl mx-auto">
        <ErrorState
          title="Couldn't Load the Catalog"
          message={error}
          onRetry={retryLoad}
        />
      </div>
    )
  }

  // Admin-curated catalog (scope change, 3 Nov 2026): only admins can add the first gadget.
  if (gadgets.length === 0 && !isAdmin) {
    return (
      <EmptyState
        icon={PackagePlus}
        title="Welcome to TekaTech"
        description="The TekaTech team is adding gadgets and their sourced specs. Check back soon to browse, ask questions and compare devices."
      />
    )
  }

  if (gadgets.length === 0) {
    return (
      <EmptyState
        icon={PackagePlus}
        title="Welcome to TekaTech"
        description="Your gadget catalog is empty. Add your first device to start building spec-grounded comparisons."
        action={
          <Link
            to="/add"
            className={`inline-flex items-center gap-1.5 bg-rail-700 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-rail-800 active:scale-95 transition ${focusRing} focus-visible:ring-offset-2`}
          >
            Add Your First Gadget
          </Link>
        }
      />
    )
  }

  return (
    <div ref={topRef} className={`scroll-mt-24 ${selected.size > 0 ? 'pb-28' : ''}`}>
      <div className="grid grid-cols-1 lg:grid-cols-[17rem_minmax(0,1fr)] xl:grid-cols-[19rem_minmax(0,1fr)] gap-8 items-start">
        {/* Filter panel */}
        <aside aria-label="Filters" className="lg:sticky lg:top-24 lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto">
          <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs flex flex-col gap-6">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              {/* Below lg the heading holds a disclosure button; from lg the filters are always
                  shown, so a plain heading avoids announcing a toggle that does nothing. */}
              <h2 className="lg:hidden text-xl font-semibold text-slate-900 tracking-tight">
                <button
                  type="button"
                  onClick={() => setFiltersOpen((o) => !o)}
                  aria-expanded={filtersOpen}
                  aria-controls="catalog-filters"
                  className={`flex items-center gap-1.5 min-h-10 rounded ${focusRing}`}
                >
                  <SlidersHorizontal size={18} className="text-rail-700" />
                  Filters
                  {hasFilters && (
                    <>
                      <span className="w-2 h-2 rounded-full bg-emerald-600" aria-hidden="true" />
                      <span className="sr-only">(active)</span>
                    </>
                  )}
                  <ChevronDown size={16} className={`text-slate-500 transition-transform ${filtersOpen ? 'rotate-180' : ''}`} />
                </button>
              </h2>
              <h2 className="hidden lg:flex items-center gap-1.5 text-xl font-semibold text-slate-900 tracking-tight">
                <SlidersHorizontal size={18} className="text-rail-700" /> Filters
              </h2>
              <button
                type="button"
                onClick={clearFilters}
                className={`font-mono text-xs font-medium text-slate-600 hover:text-rail-700 transition-colors flex items-center gap-1 min-h-10 lg:min-h-0 px-1 rounded ${focusRing}`}
              >
                Reset <RotateCcw size={12} />
              </button>
            </div>

            <div id="catalog-filters" className={`${filtersOpen ? 'flex' : 'hidden'} lg:flex flex-col gap-6`}>
              <CheckboxGroup
                title="Category"
                items={categoryCounts}
                selected={categories}
                onToggle={(value) => updateFilter(setCategories)(toggleInSet(categories, value))}
                prominent
              />

              <CheckboxGroup
                title="Brand"
                items={brandCounts}
                selected={brands}
                onToggle={(value) => updateFilter(setBrands)(toggleInSet(brands, value))}
              />

              {priceStats && priceStats.max > priceStats.min && (
                <div className="flex flex-col gap-2 bg-slate-100 p-3.5 rounded-lg border border-slate-200">
                  <div className="flex justify-between items-center font-mono text-xs">
                    <label htmlFor="price-range" className="text-slate-600 font-medium">
                      Max Price
                    </label>
                    <span className="text-rail-700 font-bold">{formatPrice(priceLimit)}</span>
                  </div>
                  <svg className="w-full h-8 text-rail-700" viewBox={`0 0 ${HISTOGRAM_BINS * 10} 28`} aria-hidden="true">
                    {priceStats.bins.map((count, i) => {
                      const height = count === 0 ? 2 : 4 + (count / priceStats.peak) * 24
                      const binStart = priceStats.min + ((priceStats.max - priceStats.min) / HISTOGRAM_BINS) * i
                      const inRange = binStart <= priceLimit
                      return (
                        <rect
                          key={i}
                          x={i * 10 + 2}
                          y={28 - height}
                          width="6"
                          height={height}
                          rx="1"
                          fill="currentColor"
                          opacity={inRange ? 0.35 + (count / priceStats.peak) * 0.65 : 0.12}
                        />
                      )
                    })}
                  </svg>
                  <input
                    id="price-range"
                    type="range"
                    aria-valuetext={formatPrice(priceLimit)}
                    min={priceStats.min}
                    max={priceStats.max}
                    step={priceStep}
                    value={priceLimit}
                    onChange={(e) => setPriceFromSlider(Number(e.target.value))}
                    className="w-full accent-rail-700"
                  />
                  <div className="flex justify-between font-mono text-xs text-slate-600">
                    <span>{formatPrice(priceStats.min)}</span>
                    <span>{formatPrice(priceStats.max)}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </aside>

        {/* Catalog */}
        <section className="min-w-0 flex flex-col gap-8">
          {/* Announces the result count when filters change; silent when none are set. */}
          <p role="status" className="sr-only">
            {hasFilters ? `${filtered.length} ${filtered.length === 1 ? 'gadget matches' : 'gadgets match'} your filters` : ''}
          </p>
          <div className="flex flex-col gap-3 bg-white rounded-xl p-4 sm:p-6 border border-slate-200 shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-3xl font-bold tracking-tight text-slate-900">Gadget Catalog</h1>
                  <span className="font-mono text-sm bg-rail-50 text-rail-800 border border-rail-200 px-2.5 py-0.5 rounded-full font-semibold">
                    {gadgets.length} device{gadgets.length === 1 ? '' : 's'}
                  </span>
                </div>
                <p className="hidden sm:block mt-1 text-sm text-slate-600">
                  Every AI answer links to the official spec it came from.
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                <label htmlFor="sort-select" className="text-slate-600 font-mono text-xs">
                  Sort By:
                </label>
                <div className="relative">
                  <select
                    id="sort-select"
                    value={sortBy}
                    onChange={(e) => updateFilter(setSortBy)(e.target.value)}
                    className="bg-slate-100 text-slate-900 font-mono text-sm font-medium py-1.5 pl-3 pr-8 min-h-10 sm:min-h-0 rounded-lg appearance-none cursor-pointer border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rail-600"
                  >
                    <option value="name">Name (A → Z)</option>
                    <option value="newest">Release Date (Newest)</option>
                    <option value="price-low">Price (Low → High)</option>
                    <option value="price-high">Price (High → Low)</option>
                  </select>
                  <ChevronDown size={14} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-slate-500" />
                </div>
              </div>
            </div>

            {hasFilters && (
              <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-200">
                <span className="font-mono text-xs text-slate-500 font-medium">Active Filters:</span>
                {query && (
                  <FilterPill label={`Search: "${query}"`} onRemove={() => setQuery('')} />
                )}
                {[...categories].map((c) => (
                  <FilterPill
                    key={`c-${c}`}
                    label={`Category: ${c}`}
                    onRemove={() => updateFilter(setCategories)(toggleInSet(categories, c))}
                  />
                ))}
                {[...brands].map((b) => (
                  <FilterPill
                    key={`b-${b}`}
                    label={`Brand: ${b}`}
                    onRemove={() => updateFilter(setBrands)(toggleInSet(brands, b))}
                  />
                ))}
                {priceFilterActive && (
                  <FilterPill
                    label={`Up to ${formatPrice(maxPrice)}`}
                    onRemove={() => updateFilter(setMaxPrice)(null)}
                  />
                )}
                <button
                  onClick={clearFilters}
                  className={`font-mono text-xs text-slate-600 hover:text-red-600 ml-1 px-1 min-h-10 sm:min-h-0 transition-colors underline rounded ${focusRing}`}
                >
                  Clear All Filters
                </button>
              </div>
            )}
          </div>

          {askedQuestion ? (
            <AIAnswerPanel question={askedQuestion} onClose={() => setAskedQuestion(null)} />
          ) : (
            <div>
              <div className="hidden md:block">
                <TrendingQuestions onSelect={ask} />
              </div>
              {/* One row on phones (scrolls sideways) so the first gadget shows on the first screen. */}
              <div className="flex flex-nowrap sm:flex-wrap gap-1.5 overflow-x-auto sm:overflow-visible -mx-1 px-1 pb-1 sm:pb-0">
                {SUGGESTED_QUESTIONS.map((q) => (
                  <button
                    key={q}
                    onClick={() => ask(q)}
                    className={`flex shrink-0 items-center gap-1 whitespace-nowrap text-sm font-medium text-rail-700 bg-rail-50 hover:bg-rail-200 border border-rail-200 rounded-full px-2.5 py-1 min-h-10 sm:min-h-8 transition active:scale-95 ${focusRing}`}
                  >
                    <Sparkles size={11} /> {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {filtered.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200">
              <EmptyState
                icon={SearchX}
                title="No Gadgets Match Your Filters"
                description="Try a different search or clear your filters."
                action={
                  <button
                    onClick={clearFilters}
                    className={`text-sm font-medium px-4 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 transition active:scale-95 ${focusRing}`}
                  >
                    Clear Filters
                  </button>
                }
              />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,17rem),1fr))] gap-4">
                {pageItems.map((g) => (
                  <GadgetCard
                    key={g.id}
                    gadget={g}
                    selected={selected.has(g.id)}
                    onToggle={() => toggleSelect(g.id)}
                    // Visitors see the button too (it leads to log in); signed-in users once their list loads.
                    mine={!user ? false : myIds ? myIds.has(g.id) : null}
                    saving={savingId === g.id}
                    onToggleMine={() => toggleMine(g)}
                  />
                ))}
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white px-6 py-4 rounded-xl border border-slate-200 shadow-xs">
                <span className="font-mono text-xs font-medium text-slate-800">
                  Showing {pageStart + 1}–{pageStart + pageItems.length} of {filtered.length} device
                  {filtered.length === 1 ? '' : 's'}
                </span>
                {pageCount > 1 && (
                  <nav className="flex flex-wrap justify-center items-center gap-1.5" aria-label="Pagination">
                    <PageButton disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>
                      Prev
                    </PageButton>
                    {Array.from({ length: pageCount }, (_, i) => i + 1).map((n) => (
                      <PageButton key={n} active={n === currentPage} onClick={() => setPage(n)}>
                        {n}
                      </PageButton>
                    ))}
                    <PageButton disabled={currentPage === pageCount} onClick={() => setPage(currentPage + 1)}>
                      Next
                    </PageButton>
                  </nav>
                )}
              </div>
            </>
          )}
        </section>
      </div>

      {selectedGadgets.length > 0 && (
        <CompareTray
          gadgets={selectedGadgets}
          onRemove={toggleSelect}
          onClear={() => setSelected(new Set())}
          onCompare={() => navigate(`/compare?ids=${[...selected].join(',')}`)}
        />
      )}
    </div>
  )
}

function CheckboxGroup({ title, items, selected, onToggle, prominent = false }) {
  if (items.length === 0) return null
  return (
    <fieldset className="flex flex-col gap-1.5 border-t border-slate-200 pt-3 first:border-t-0 first:pt-0">
      <legend className="font-mono text-xs uppercase tracking-wider text-slate-500 font-semibold mb-1.5">
        {title}
      </legend>
      <div className="flex flex-col gap-1 max-h-60 overflow-y-auto">
        {items.map(([value, count]) => {
          const checked = selected.has(value)
          return (
            <label
              key={value}
              className={`flex items-center justify-between px-2 py-1.5 rounded-lg border cursor-pointer transition-colors ${
                checked && prominent
                  ? 'bg-rail-50 border-rail-200 text-slate-900'
                  : 'border-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              } text-sm`}
            >
              <span className="flex items-center gap-2 min-w-0">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => onToggle(value)}
                  className="w-4 h-4 rounded border-slate-300 accent-rail-700"
                />
                {prominent && (
                  <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${categoryLine(value).dot}`} aria-hidden="true" />
                )}
                <span className={`truncate ${checked ? 'font-medium text-slate-900' : ''}`}>{value}</span>
              </span>
              <span
                className={`font-mono text-xs px-1.5 py-0.5 rounded ${
                  checked
                    ? 'bg-white text-rail-800 border border-rail-200 font-semibold'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                {count}
              </span>
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}

function FilterPill({ label, onRemove }) {
  return (
    <span className="flex items-center gap-1 bg-slate-100 border border-slate-200 px-2 py-1 rounded-md font-mono text-xs text-rail-700 font-medium">
      {label}
      <button
        onClick={onRemove}
        aria-label={`Remove filter ${label}`}
        className={`text-slate-600 hover:text-slate-800 flex items-center p-1 -m-1 rounded ${hitArea} ${focusRing}`}
      >
        <X size={12} />
      </button>
    </span>
  )
}

function PageButton({ children, active = false, disabled = false, onClick }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-current={active ? 'page' : undefined}
      className={`px-3 py-1.5 min-h-10 min-w-10 sm:min-h-0 sm:min-w-0 rounded font-mono text-xs transition-colors ${focusRing} ${
        active
          ? 'bg-rail-700 text-white font-semibold shadow-xs'
          : 'bg-slate-100 border border-slate-200 text-slate-700 font-medium hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-slate-100'
      }`}
    >
      {children}
    </button>
  )
}

// A compact catalog card (rebrand step 2). The whole card opens the gadget page: the
// name's link stretches over the card. Only Compare and Save sit above it; Ask AI lives
// on the gadget page and Delete with the other admin controls there.
export function GadgetCard({ gadget, selected, onToggle, mine, saving, onToggleMine }) {
  const [imgError, setImgError] = useState(false)
  const showImage = gadget.image_url && !imgError
  const release = formatRelease(gadget.release_date)
  const price = formatPeso(gadget.price_php)
  const line = categoryLine(gadget.category)

  return (
    <article
      className={`group relative bg-white rounded-xl border p-4 flex flex-col gap-3 transition-shadow hover:shadow-md focus-within:shadow-md ${
        selected ? 'border-rail-600 ring-2 ring-rail-600/25' : 'border-slate-200 hover:border-rail-300'
      }`}
    >
      <div className="flex gap-4">
        <div className="w-16 h-16 rounded-lg bg-slate-100 overflow-hidden shrink-0 flex items-center justify-center">
          {showImage ? (
            <img
              src={gadget.image_url}
              alt=""
              className="w-full h-full object-cover"
              onError={() => setImgError(true)}
            />
          ) : (
            <ImageOff size={20} className="text-slate-300" aria-hidden="true" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-600">
            <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${line.dot}`} aria-hidden="true" />
            <span className="truncate">{gadget.category}</span>
          </p>
          <h3 className="font-display text-xl font-bold leading-tight text-slate-900 truncate">
            <Link
              to={`/gadgets/${gadget.id}`}
              className={`rounded group-hover:underline decoration-2 after:absolute after:inset-0 after:rounded-xl ${focusRing}`}
            >
              {gadget.name}
            </Link>
          </h3>
          <p className="text-sm text-slate-600 truncate">
            {gadget.brand}
            {release && <span className="text-slate-500"> · {release}</span>}
          </p>
        </div>
      </div>

      <p className="font-mono text-2xl font-bold text-slate-900 leading-none">
        {price ?? <span className="text-sm font-semibold text-slate-500">Price not listed</span>}
      </p>

      {/* Above the stretched link, so these stay their own controls. */}
      <div className="relative z-10 flex items-center justify-between gap-2 pt-3 border-t border-slate-100">
        <label className="flex items-center gap-2 min-h-10 cursor-pointer select-none rounded-md focus-within:ring-2 focus-within:ring-rail-600 px-1 -mx-1">
          <input
            type="checkbox"
            checked={selected}
            onChange={onToggle}
            aria-label={`Compare ${gadget.name}`}
            className="w-5 h-5 rounded border-slate-300 accent-rail-700 focus:outline-none"
          />
          <span className={`text-sm font-semibold ${selected ? 'text-rail-800' : 'text-slate-800'}`}>
            {selected ? 'In Compare' : 'Compare'}
          </span>
        </label>
        {mine !== null && (
          <button
            type="button"
            onClick={onToggleMine}
            disabled={saving}
            aria-pressed={mine}
            aria-label={`${gadget.name}: ${mine ? 'in My Gadgets, select to remove' : 'add to My Gadgets'}`}
            className={`flex items-center gap-1.5 min-h-10 px-3 rounded-lg text-sm font-semibold transition disabled:opacity-60 ${focusRing} ${
              mine ? 'bg-rail-50 text-rail-800 hover:bg-rail-100' : 'text-slate-700 hover:bg-slate-100'
            }`}
          >
            {mine ? <BookmarkCheck size={16} aria-hidden="true" /> : <BookmarkPlus size={16} aria-hidden="true" />}
            {mine ? 'Saved' : 'Save'}
          </button>
        )}
      </div>
    </article>
  )
}

function CompareTray({ gadgets, onRemove, onClear, onCompare }) {
  const canCompare = gadgets.length >= 2
  return (
    <aside
      aria-label="Compare tray"
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-20 w-[95%] max-w-4xl bg-rail-900 text-white rounded-xl p-3.5 shadow-2xl shadow-rail-950/30 animate-fade-in"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 px-1">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-0">
          <div className="flex items-center gap-1.5 font-mono text-sm shrink-0">
            <Scale size={18} className="text-line-yellow" aria-hidden="true" />
            <span className="font-bold uppercase tracking-wider text-white">Compare</span>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            {gadgets.map((g, i) => (
              <span key={g.id} className="flex items-center gap-1.5">
                {i > 0 && <span className="font-mono text-xs text-rail-300 font-bold">VS</span>}
                <span className="flex items-center gap-1.5 bg-rail-800 border border-rail-700 px-2.5 py-1 rounded-lg text-white text-sm">
                  <span className={`w-2.5 h-2.5 rounded-full ${compareLine(i).dot}`} aria-hidden="true" />
                  <span className="font-semibold">{g.name}</span>
                  <button
                    onClick={() => onRemove(g.id)}
                    aria-label={`Remove ${g.name} from comparison`}
                    className={`text-rail-200 hover:text-white ml-0.5 p-1 -m-1 transition-colors rounded ${hitArea} ${trayFocusRing}`}
                  >
                    <X size={12} />
                  </button>
                </span>
              </span>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onClear}
            className={`font-mono text-xs text-rail-200 hover:text-white px-1 py-1 min-h-10 sm:min-h-0 transition-colors font-medium rounded ${trayFocusRing}`}
          >
            Clear ({gadgets.length})
          </button>
          <button
            onClick={onCompare}
            disabled={!canCompare}
            title={canCompare ? undefined : 'Select at least 2 to compare'}
            className={`bg-line-yellow text-line-yellow-ink hover:brightness-95 text-sm px-4 py-2 min-h-10 rounded-lg font-bold flex items-center gap-1.5 transition disabled:opacity-50 disabled:cursor-not-allowed ${trayFocusRing} focus-visible:ring-offset-2 focus-visible:ring-offset-rail-900`}
          >
            Compare Now ({gadgets.length}) <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </aside>
  )
}
