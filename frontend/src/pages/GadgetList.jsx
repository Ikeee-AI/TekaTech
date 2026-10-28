import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
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
  BadgeCheck,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { api } from '../api/client'
import EmptyState from '../components/EmptyState'
import ErrorState from '../components/ui/ErrorState'
import Button from '../components/ui/Button'
import DeleteGadgetButton from '../components/DeleteGadgetButton'
import { CatalogSkeleton } from '../components/Skeleton'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import AIAnswerPanel from '../components/AIAnswerPanel'
import TrendingQuestions from '../components/TrendingQuestions'
import { friendlyError } from '../utils/requestErrors'
import { gadgetDisplayName } from '../utils/gadgetName'

const SUGGESTED_QUESTIONS = [
  'Which gadget has the best battery life?',
  'What phones support fast charging?',
  'Compare display quality across gadgets',
]

const PAGE_SIZE = 6
const HISTOGRAM_BINS = 11

const focusRing = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage-600'
// Widens a small icon button's touch area to about 40px without changing its look.
const hitArea = "relative before:absolute before:-inset-2.5 before:content-['']"

function formatPrice(value) {
  return `Php ${Math.round(value).toLocaleString()}`
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

// Gadgets without a price sort last in both directions, not first as Php 0.
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

  function handleDeleted(gadget) {
    setGadgets((prev) => prev.filter((g) => g.id !== gadget.id))
    setSelected((prev) => {
      const next = new Set(prev)
      next.delete(gadget.id)
      return next
    })
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

  if (gadgets.length === 0) {
    return (
      <EmptyState
        icon={PackagePlus}
        title="Welcome to TekaTech"
        description="Your gadget catalog is empty. Add your first device to start building spec-grounded comparisons."
        action={
          <Link
            to="/add"
            className={`inline-flex items-center gap-1.5 bg-sage-700 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-sage-800 active:scale-95 transition ${focusRing} focus-visible:ring-offset-2`}
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
                  <SlidersHorizontal size={18} className="text-sage-700" />
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
                <SlidersHorizontal size={18} className="text-sage-700" /> Filters
              </h2>
              <button
                type="button"
                onClick={clearFilters}
                className={`font-mono text-xs font-medium text-slate-600 hover:text-sage-700 transition-colors flex items-center gap-1 min-h-10 lg:min-h-0 px-1 rounded ${focusRing}`}
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
                    <span className="text-sage-700 font-bold">{formatPrice(priceLimit)}</span>
                  </div>
                  <svg className="w-full h-8 text-sage-700" viewBox={`0 0 ${HISTOGRAM_BINS * 10} 28`} aria-hidden="true">
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
                    step={Math.max(1, Math.round((priceStats.max - priceStats.min) / 100))}
                    value={priceLimit}
                    onChange={(e) => updateFilter(setMaxPrice)(Number(e.target.value))}
                    className="w-full accent-sage-700"
                  />
                  <div className="flex justify-between font-mono text-[11px] text-slate-600">
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
          <div className="flex flex-col gap-3 bg-white rounded-xl p-6 border border-slate-200 shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-3xl font-bold tracking-tight text-slate-900">Gadget Catalog</h1>
                  <span className="font-mono text-sm bg-emerald-100 text-emerald-800 border border-emerald-200 px-2.5 py-0.5 rounded-full font-semibold">
                    {gadgets.length} device{gadgets.length === 1 ? '' : 's'}
                  </span>
                </div>
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
                    className="bg-slate-100 text-slate-900 font-mono text-sm font-medium py-1.5 pl-3 pr-8 min-h-10 sm:min-h-0 rounded-lg appearance-none cursor-pointer border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sage-600"
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
              <TrendingQuestions onSelect={ask} />
              <div className="flex flex-wrap gap-1.5">
                {SUGGESTED_QUESTIONS.map((q) => (
                  <button
                    key={q}
                    onClick={() => ask(q)}
                    className={`flex items-center gap-1 text-sm font-medium text-sage-700 bg-sage-50 hover:bg-sage-200 border border-sage-200 rounded-full px-2.5 py-1 min-h-10 sm:min-h-8 transition active:scale-95 ${focusRing}`}
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
              <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,23rem),1fr))] gap-6">
                {pageItems.map((g) => (
                  <GadgetCard
                    key={g.id}
                    gadget={g}
                    selected={selected.has(g.id)}
                    onToggle={() => toggleSelect(g.id)}
                    onAsk={() => ask(`What are the key specs of the ${gadgetDisplayName(g)}?`)}
                    onDeleted={handleDeleted}
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
                  ? 'bg-emerald-50 border-emerald-200 text-slate-900'
                  : 'border-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              } ${prominent ? 'text-sm' : 'text-sm'}`}
            >
              <span className="flex items-center gap-2 min-w-0">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => onToggle(value)}
                  className="w-4 h-4 rounded border-slate-300 accent-sage-700"
                />
                <span className={`truncate ${checked ? 'font-medium text-slate-900' : ''}`}>{value}</span>
              </span>
              <span
                className={`font-mono text-xs px-1.5 py-0.5 rounded ${
                  checked
                    ? 'bg-white text-emerald-800 border border-emerald-200 font-semibold'
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
    <span className="flex items-center gap-1 bg-slate-100 border border-slate-200 px-2 py-1 rounded-md font-mono text-xs text-sage-700 font-medium">
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
          ? 'bg-sage-700 text-white font-semibold shadow-xs'
          : 'bg-slate-100 border border-slate-200 text-slate-700 font-medium hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-slate-100'
      }`}
    >
      {children}
    </button>
  )
}

function SpecCell({ label, value, sub }) {
  return (
    <div className="flex flex-col min-w-0">
      <span className="font-mono text-[11px] text-slate-600 uppercase tracking-wider font-medium">{label}</span>
      <span className="font-mono text-sm text-slate-900 font-semibold truncate">{value}</span>
      {sub && <span className="font-mono text-[11px] text-slate-600 truncate">{sub}</span>}
    </div>
  )
}

function GadgetCard({ gadget, selected, onToggle, onAsk, onDeleted }) {
  const [imgError, setImgError] = useState(false)
  const showImage = gadget.image_url && !imgError
  const release = formatRelease(gadget.release_date)

  return (
    <article
      className={`relative bg-white rounded-xl p-6 border shadow-xs flex flex-col justify-between hover:shadow-md transition-all group ${
        selected ? 'border-sage-400 ring-1 ring-sage-400' : 'border-slate-200 hover:border-slate-300'
      }`}
    >
      <div className="flex flex-col gap-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5 min-w-0">
            <span className="font-mono text-xs bg-slate-100 text-slate-700 border border-slate-200 px-2 py-0.5 rounded font-medium">
              {gadget.category}
            </span>
            {release && <span className="font-mono text-xs text-slate-500 shrink-0">Rel. {release}</span>}
          </div>
          {selected && (
            <span className="flex items-center gap-1 bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-full font-mono text-xs font-semibold shrink-0">
              <BadgeCheck size={13} className="text-emerald-700" /> In Compare
            </span>
          )}
        </div>

        <div className="flex gap-5">
          <div className="w-24 h-24 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
            {showImage ? (
              <img
                src={gadget.image_url}
                alt={gadget.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                onError={() => setImgError(true)}
              />
            ) : (
              <ImageOff size={22} className="text-slate-300" />
            )}
          </div>
          <div className="flex flex-col justify-center min-w-0">
            <h3 className="text-xl font-bold text-slate-900 tracking-tight truncate">
              <Link to={`/gadgets/${gadget.id}`} className={`hover:underline rounded ${focusRing}`}>
                {gadget.name}
              </Link>
            </h3>
            <span className="font-mono text-xs text-sage-700 font-semibold truncate">{gadget.brand}</span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 bg-slate-100 border border-slate-200 px-3.5 py-3 rounded-lg">
          <SpecCell label="Brand" value={gadget.brand} />
          <SpecCell label="Price" value={gadget.price_php != null ? formatPrice(gadget.price_php) : '—'} />
          <SpecCell label="Released" value={release ?? '—'} />
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 pt-5 mt-5 border-t border-slate-200">
        <label className="flex items-center gap-2 min-h-9 cursor-pointer select-none rounded-md focus-within:ring-2 focus-within:ring-sage-600 px-1 -mx-1">
          <input
            type="checkbox"
            checked={selected}
            onChange={onToggle}
            className="w-5 h-5 rounded border-slate-300 accent-sage-700 focus:outline-none"
          />
          <span className="text-sm text-slate-800 font-semibold">
            Compare<span className="sr-only"> {gadget.name}</span>
          </span>
        </label>
        <div className="flex items-center gap-2">
          <DeleteGadgetButton gadget={gadget} onDeleted={onDeleted} size="sm" iconOnly />
          <Button variant="subtle" size="sm" icon={Sparkles} onClick={onAsk}>
            Ask AI<span className="sr-only"> about {gadget.name}</span>
          </Button>
          <Button as={Link} to={`/gadgets/${gadget.id}`} variant="primary" size="sm">
            Details<span className="sr-only"> for {gadget.name}</span> <ArrowRight size={14} aria-hidden="true" />
          </Button>
        </div>
      </div>
    </article>
  )
}

function CompareTray({ gadgets, onRemove, onClear, onCompare }) {
  const canCompare = gadgets.length >= 2
  return (
    <aside
      aria-label="Compare tray"
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-20 w-[95%] max-w-4xl bg-white/95 backdrop-blur-md rounded-xl p-3.5 border border-slate-200 shadow-2xl animate-fade-in"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 px-1">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-0">
          <div className="flex items-center gap-1.5 font-mono text-sm shrink-0">
            <Scale size={18} className="text-emerald-800" />
            <span className="font-bold uppercase tracking-wider text-slate-900">Compare</span>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            {gadgets.map((g, i) => (
              <span key={g.id} className="flex items-center gap-1.5">
                {i > 0 && <span className="font-mono text-xs text-slate-500 font-bold">VS</span>}
                <span className="flex items-center gap-1.5 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-lg text-slate-900 text-sm shadow-xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                  <span className="font-semibold">{g.name}</span>
                  <button
                    onClick={() => onRemove(g.id)}
                    aria-label={`Remove ${g.name} from comparison`}
                    className={`text-slate-600 hover:text-red-700 ml-0.5 p-1 -m-1 transition-colors rounded ${hitArea} ${focusRing}`}
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
            className={`font-mono text-xs text-slate-500 hover:text-red-600 px-1 py-1 min-h-10 sm:min-h-0 transition-colors font-medium rounded ${focusRing}`}
          >
            Clear ({gadgets.length})
          </button>
          <button
            onClick={onCompare}
            disabled={!canCompare}
            title={canCompare ? undefined : 'Select at least 2 to compare'}
            className={`bg-sage-400 text-sage-900 hover:bg-[#73a082] text-sm px-4 py-2 rounded-lg font-bold flex items-center gap-1.5 transition-colors shadow-xs disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-sage-400 ${focusRing}`}
          >
            Compare Now ({gadgets.length}) <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </aside>
  )
}
