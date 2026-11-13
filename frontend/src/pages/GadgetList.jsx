import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import {
  Sparkles,
  ChevronDown,
  X,
  ArrowRight,
  Scale,
  PackagePlus,
  SearchX,
  BadgeCheck,
  BookmarkPlus,
  BookmarkCheck,
  ChevronLeft,
  ChevronRight,
  Pause,
  Play,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { api } from '../api/client'
import EmptyState from '../components/EmptyState'
import ErrorState from '../components/ui/ErrorState'
import Button from '../components/ui/Button'
import DeleteGadgetButton from '../components/DeleteGadgetButton'
import KeySpecTiles from '../components/KeySpecTiles'
import PhoneGlyph from '../components/PhoneGlyph'
import PriceTag from '../components/PriceTag'
import { CatalogSkeleton } from '../components/Skeleton'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { useAuth } from '../hooks/useAuth'
import AIAnswerPanel from '../components/AIAnswerPanel'
import TrendingQuestions from '../components/TrendingQuestions'
import SignInPrompt from '../components/SignInPrompt'
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion'
import { friendlyError } from '../utils/requestErrors'
import { gadgetDisplayName } from '../utils/gadgetName'
import { formatPeso } from '../utils/formatPeso'
import { extractKeySpecs } from '../utils/keySpecs'

const SUGGESTED_QUESTIONS = [
  'Which phone has the best battery life?',
  'What phones support fast charging?',
  'Compare display quality across phones',
]

const PAGE_SIZE = 12
// Spec counts for the cards and the featured phone come from one request per gadget.
// Fine for today's small, admin-curated catalog; past this many, cards skip the count
// (a spec count on GET /gadgets would remove the extra requests — backend follow-up).
const SPEC_FETCH_LIMIT = 24
const BRAND_TILES = 6
// Featured hero: one phone with saved specs at a time, shuffled, a new one every 8 seconds.
export const HERO_ROTATE_MS = 8000

const focusRing = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage-600'
// Widens a small icon button's touch area to about 40px without changing its look.
const hitArea = "relative before:absolute before:-inset-2.5 before:content-['']"

// Brand tiles cycle through the bento colours (theme-aware tokens).
const BRAND_STYLES = [
  'bg-white text-slate-900 border-slate-200',
  'bg-sage-700 text-white border-sage-700',
  'bg-pop text-pop-ink border-pop',
  'bg-inverse text-inverse-ink border-inverse',
]

function formatPrice(value) {
  return formatPeso(value) ?? '—'
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
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
}

// Gadgets without a price sort last in both directions, not first as ₱0.
function comparePrices(a, b, direction) {
  const aMissing = a.price_php == null
  const bMissing = b.price_php == null
  if (aMissing || bMissing) return aMissing === bMissing ? 0 : aMissing ? 1 : -1
  return (a.price_php - b.price_php) * direction
}

// Fisher-Yates. Called from the specs request's callback, never during render.
function shuffled(list) {
  const out = [...list]
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

function toggleInSet(set, value) {
  const next = new Set(set)
  if (next.has(value)) next.delete(value)
  else next.add(value)
  return next
}

export default function GadgetList() {
  useDocumentTitle('Phones')
  const { user } = useAuth()
  const isAdmin = Boolean(user?.app_metadata?.is_admin)
  // Signed-out visitors may only browse the catalog (owner decision, 14 Nov 2026): asking the
  // AI, comparing, phone pages and My Gadgets open the sign-in prompt instead.
  const signedIn = Boolean(user)
  const [signInPromptOpen, setSignInPromptOpen] = useState(false)
  const requireSignIn = () => setSignInPromptOpen(true)
  const [gadgets, setGadgets] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  // Search text and the AI question live in the URL so the navbar search bar can set them.
  const [searchParams, setSearchParams] = useSearchParams()
  const query = searchParams.get('q') ?? ''
  const askedQuestion = searchParams.get('ask')
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

  // Saved specs per gadget: the "N sourced specs" chips and the featured phone's key-spec tiles.
  // null = still loading. A failed request leaves that gadget without a count.
  const [specsById, setSpecsById] = useState(null)
  // Shuffled ids of the phones with saved specs: the featured hero's rotation order.
  const [heroOrder, setHeroOrder] = useState([])
  useEffect(() => {
    if (gadgets.length === 0 || typeof api.getSpecs !== 'function') return undefined
    let cancelled = false
    const ids = gadgets.slice(0, SPEC_FETCH_LIMIT).map((g) => g.id)
    Promise.allSettled(ids.map((id) => api.getSpecs(id))).then((results) => {
      if (cancelled) return
      const map = {}
      results.forEach((r, i) => {
        if (r.status === 'fulfilled' && Array.isArray(r.value)) map[ids[i]] = r.value
      })
      setSpecsById(map)
      setHeroOrder(shuffled(ids.filter((id) => map[id]?.length > 0)))
    })
    return () => {
      cancelled = true
    }
  }, [gadgets])

  // My Gadgets: which catalog gadgets the signed-in user has on their dashboard.
  // null = not loaded (or signed out); the card buttons wait for it before showing a state.
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
      requireSignIn()
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

  function handleDeleted(gadget) {
    setGadgets((prev) => prev.filter((g) => g.id !== gadget.id))
    setSelected((prev) => {
      const next = new Set(prev)
      next.delete(gadget.id)
      return next
    })
  }

  const brandCounts = useMemo(() => countBy(gadgets, 'brand'), [gadgets])

  const priceStats = useMemo(() => {
    const prices = gadgets.map((g) => g.price_php).filter((p) => p != null)
    if (prices.length === 0) return null
    return { min: Math.min(...prices), max: Math.max(...prices) }
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
      if (brands.size > 0 && !brands.has(g.brand)) return false
      if (priceFilterActive && (g.price_php == null || g.price_php > maxPrice)) return false
      return g.name.toLowerCase().includes(q) || g.brand.toLowerCase().includes(q)
    })
    if (sortBy === 'price-low') list = [...list].sort((a, b) => comparePrices(a, b, 1))
    else if (sortBy === 'price-high') list = [...list].sort((a, b) => comparePrices(a, b, -1))
    else if (sortBy === 'newest') list = [...list].sort((a, b) => (b.release_date ?? '').localeCompare(a.release_date ?? ''))
    else list = [...list].sort((a, b) => a.name.localeCompare(b.name))
    return list
  }, [gadgets, query, brands, priceFilterActive, maxPrice, sortBy])

  // Featured phones, in the shuffled rotation order. Built from the specs already fetched;
  // a deleted gadget drops out without reshuffling the rest.
  const featured = useMemo(() => {
    if (!specsById) return []
    const byId = new Map(gadgets.map((g) => [g.id, g]))
    return heroOrder
      .filter((id) => byId.has(id) && specsById[id]?.length > 0)
      .map((id) => ({ gadget: byId.get(id), specs: specsById[id], keySpecs: extractKeySpecs(specsById[id]) }))
  }, [gadgets, specsById, heroOrder])

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, pageCount)
  const pageStart = (currentPage - 1) * PAGE_SIZE
  const pageItems = filtered.slice(pageStart, pageStart + PAGE_SIZE)

  const selectedGadgets = useMemo(
    () => [...selected].map((id) => gadgets.find((g) => g.id === id)).filter(Boolean),
    [selected, gadgets],
  )

  const hasFilters = query || brands.size > 0 || priceFilterActive

  function toggleSelect(id) {
    if (!signedIn) {
      requireSignIn()
      return
    }
    setSelected((prev) => {
      if (!prev.has(id) && prev.size >= 3) {
        toast.error('You can compare up to 3 phones at a time')
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
    setBrands(new Set())
    setMaxPrice(null)
    setPage(1)
  }

  function ask(question) {
    if (!signedIn) {
      requireSignIn()
      return
    }
    setAskedQuestion(question)
    topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  function specCount(id) {
    if (!specsById) return undefined
    return specsById[id] ? specsById[id].length : undefined
  }

  if (loading) return <CatalogSkeleton />
  if (error) {
    return (
      <div className="max-w-2xl mx-auto">
        <ErrorState title="Couldn't Load the Catalog" message={error} onRetry={retryLoad} />
      </div>
    )
  }

  // Admin-curated catalog (scope change, 3 Nov 2026): only admins can add the first gadget.
  if (gadgets.length === 0 && !isAdmin) {
    return (
      <EmptyState
        icon={PackagePlus}
        title="Welcome to TekaTech"
        description="The TekaTech team is adding phones and their sourced specs. Check back soon to browse, ask questions and compare."
      />
    )
  }

  if (gadgets.length === 0) {
    return (
      <EmptyState
        icon={PackagePlus}
        title="Welcome to TekaTech"
        description="Your catalog is empty. Add your first phone to start building spec-grounded comparisons."
        action={
          <Button as={Link} to="/add" variant="primary">
            Add Your First Phone
          </Button>
        }
      />
    )
  }

  // A shared ?ask= link opens the AI panel only for signed-in users; visitors see the catalog.
  const activeQuestion = signedIn ? askedQuestion : null
  const showHero = !hasFilters && !activeQuestion

  return (
    <div ref={topRef} className={`scroll-mt-24 flex flex-col gap-7 ${selected.size > 0 ? 'pb-28' : ''}`}>
      <h1 className="sr-only">TekaTech phone catalog</h1>
      {/* Announces the result count when filters change; silent when none are set. */}
      <p role="status" className="sr-only">
        {hasFilters ? `${filtered.length} ${filtered.length === 1 ? 'phone matches' : 'phones match'} your filters` : ''}
      </p>

      {showHero &&
        (featured.length > 0 ? (
          <FeaturedHero
            items={featured}
            selectedIds={selected}
            onToggleCompare={(g) => toggleSelect(g.id)}
            onAsk={(g) => ask(`What are the key specs of the ${gadgetDisplayName(g)}?`)}
            onRequireSignIn={signedIn ? undefined : requireSignIn}
          />
        ) : (
          specsById === null && typeof api.getSpecs === 'function' && (
            <div className="h-[380px] rounded-[28px] bg-white border border-slate-200 animate-pulse" aria-hidden="true" />
          )
        ))}

      {activeQuestion ? (
        <AIAnswerPanel question={activeQuestion} onClose={() => setAskedQuestion(null)} />
      ) : (
        signedIn && (
        <div className="flex flex-col gap-2">
          <TrendingQuestions onSelect={ask} />
          <div className="flex flex-wrap gap-1.5">
            {SUGGESTED_QUESTIONS.map((q) => (
              <button
                key={q}
                onClick={() => ask(q)}
                className={`flex items-center gap-1.5 text-sm font-semibold text-slate-800 bg-white hover:bg-slate-100 border border-slate-200 rounded-full px-3.5 py-1.5 min-h-10 sm:min-h-9 transition active:scale-95 ${focusRing}`}
              >
                <Sparkles size={13} className="text-sage-700" aria-hidden="true" /> {q}
              </button>
            ))}
          </div>
        </div>
        )
      )}

      <section aria-labelledby="brands-heading">
        <h2 id="brands-heading" className="text-2xl font-extrabold tracking-[-0.035em] text-slate-900 mb-3">
          Shop by brand
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-3">
          <BrandTile
            label="All phones"
            count={gadgets.length}
            pressed={brands.size === 0}
            styleIndex={3}
            onClick={() => updateFilter(setBrands)(new Set())}
          />
          {brandCounts.slice(0, BRAND_TILES).map(([brand, count], i) => (
            <BrandTile
              key={brand}
              label={brand}
              count={count}
              pressed={brands.has(brand)}
              styleIndex={i % 3}
              onClick={() => updateFilter(setBrands)(toggleInSet(brands, brand))}
            />
          ))}
        </div>
      </section>

      <section aria-labelledby="catalog-heading" className="flex flex-col gap-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 id="catalog-heading" className="text-2xl font-extrabold tracking-[-0.035em] text-slate-900">
            {hasFilters ? 'Matching phones' : 'All phones'}{' '}
            <span className="text-base font-medium text-slate-500">
              {filtered.length} {filtered.length === 1 ? 'phone' : 'phones'}
            </span>
          </h2>
          <div className="flex flex-wrap items-center gap-2">
            {priceStats && priceStats.max > priceStats.min && (
              <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-full pl-4 pr-3 min-h-10">
                <label htmlFor="price-range" className="text-sm font-semibold text-slate-700 whitespace-nowrap">
                  Max Price
                </label>
                <input
                  id="price-range"
                  type="range"
                  aria-valuetext={formatPrice(priceLimit)}
                  min={priceStats.min}
                  max={priceStats.max}
                  step={priceStep}
                  value={priceLimit}
                  onChange={(e) => setPriceFromSlider(Number(e.target.value))}
                  className="w-28 sm:w-36 accent-sage-700"
                />
                <span className="font-mono text-sm font-semibold text-slate-900 min-w-[5.5rem] text-right">
                  {priceFilterActive ? formatPrice(priceLimit) : 'Any'}
                </span>
              </div>
            )}
            <div className="relative">
              <label htmlFor="sort-select" className="sr-only">
                Sort by
              </label>
              <select
                id="sort-select"
                value={sortBy}
                onChange={(e) => updateFilter(setSortBy)(e.target.value)}
                className="bg-white text-slate-900 text-sm font-semibold py-2 pl-4 pr-9 min-h-10 rounded-full appearance-none cursor-pointer border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sage-600"
              >
                <option value="name">Name (A → Z)</option>
                <option value="newest">Newest first</option>
                <option value="price-low">Price (low → high)</option>
                <option value="price-high">Price (high → low)</option>
              </select>
              <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" />
            </div>
          </div>
        </div>

        {hasFilters && (
          <div className="flex flex-wrap items-center gap-1.5">
            {query && <FilterPill label={`Search: "${query}"`} onRemove={() => setQuery('')} />}
            {[...brands].map((b) => (
              <FilterPill
                key={`b-${b}`}
                label={`Brand: ${b}`}
                onRemove={() => updateFilter(setBrands)(toggleInSet(brands, b))}
              />
            ))}
            {priceFilterActive && (
              <FilterPill label={`Up to ${formatPrice(maxPrice)}`} onRemove={() => updateFilter(setMaxPrice)(null)} />
            )}
            <button
              onClick={clearFilters}
              className={`text-sm font-semibold text-slate-600 hover:text-slate-900 px-2 min-h-10 sm:min-h-8 underline rounded ${focusRing}`}
            >
              Clear all
            </button>
          </div>
        )}

        {filtered.length === 0 ? (
          <div className="bg-white rounded-[28px] border border-slate-200">
            <EmptyState
              icon={SearchX}
              title="No Phones Match Your Filters"
              description="Try a different search or clear your filters."
              action={
                <Button onClick={clearFilters} variant="secondary">
                  Clear Filters
                </Button>
              }
            />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,270px),1fr))] gap-3.5">
              {pageItems.map((g) => (
                <GadgetCard
                  key={g.id}
                  gadget={g}
                  specCount={specCount(g.id)}
                  selected={selected.has(g.id)}
                  onToggle={() => toggleSelect(g.id)}
                  onAsk={() => ask(`What are the key specs of the ${gadgetDisplayName(g)}?`)}
                  onDeleted={handleDeleted}
                  // Visitors see the button too (it opens the sign-in prompt); signed-in users once their list loads.
                  mine={!user ? false : myIds ? myIds.has(g.id) : null}
                  saving={savingId === g.id}
                  onToggleMine={() => toggleMine(g)}
                  onRequireSignIn={signedIn ? undefined : requireSignIn}
                />
              ))}
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <span className="font-mono text-xs font-medium text-slate-600">
                Showing {pageStart + 1}–{pageStart + pageItems.length} of {filtered.length} phone
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

      {selectedGadgets.length > 0 && (
        <CompareTray
          gadgets={selectedGadgets}
          onRemove={toggleSelect}
          onClear={() => setSelected(new Set())}
          onCompare={() => navigate(`/compare?ids=${[...selected].join(',')}`)}
        />
      )}

      <SignInPrompt open={signInPromptOpen} onClose={() => setSignInPromptOpen(false)} />
    </div>
  )
}

/**
 * Featured hero: rotates through the phones with saved specs (already shuffled by the caller),
 * one every HERO_ROTATE_MS with a cross-fade. WCAG 2.2.2: a visible Pause/Play control, and the
 * rotation also waits while the pointer is over the hero or keyboard focus is inside it. With
 * prefers-reduced-motion there is no auto-rotation; Prev/Next buttons appear instead.
 * Changes are deliberately not announced (no aria-live): the user did not ask for them.
 * All slides share one grid cell, so the hero is as tall as its tallest slide and never jumps.
 */
export function FeaturedHero({ items, selectedIds, onToggleCompare, onAsk, onRequireSignIn }) {
  const reducedMotion = usePrefersReducedMotion()
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const [hovered, setHovered] = useState(false)
  const [focusInside, setFocusInside] = useState(false)
  const count = items.length
  const current = count > 0 ? index % count : 0
  const rotating = count > 1 && !reducedMotion && !paused && !hovered && !focusInside

  useEffect(() => {
    if (!rotating) return undefined
    const timer = setInterval(() => setIndex((i) => (i + 1) % count), HERO_ROTATE_MS)
    return () => clearInterval(timer)
  }, [rotating, count])

  const show = (i) => setIndex(((i % count) + count) % count)

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Featured phones"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setFocusInside(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setFocusInside(false)
      }}
      className="flex flex-col gap-3"
    >
      <div className="grid">
        {items.map((item, i) => (
          <HeroSlide
            key={item.gadget.id}
            item={item}
            active={i === current}
            position={`${i + 1} of ${count}`}
            selected={selectedIds.has(item.gadget.id)}
            onToggleCompare={() => onToggleCompare(item.gadget)}
            onAsk={() => onAsk(item.gadget)}
            onRequireSignIn={onRequireSignIn}
          />
        ))}
      </div>

      {count > 1 && (
        <div className="flex flex-wrap items-center gap-2">
          {reducedMotion ? (
            <>
              <Button size="sm" variant="subtle" icon={ChevronLeft} onClick={() => show(current - 1)} aria-label="Previous featured phone">
                Prev
              </Button>
              <Button size="sm" variant="subtle" icon={ChevronRight} onClick={() => show(current + 1)} aria-label="Next featured phone">
                Next
              </Button>
            </>
          ) : (
            <Button
              size="sm"
              variant="subtle"
              icon={paused ? Play : Pause}
              onClick={() => setPaused((p) => !p)}
              aria-label={paused ? 'Play featured phones rotation' : 'Pause featured phones rotation'}
            >
              {paused ? 'Play' : 'Pause'}
            </Button>
          )}
          <div className="flex flex-wrap items-center gap-1 ml-1">
            {items.map((item, i) => (
              <button
                key={item.gadget.id}
                type="button"
                onClick={() => show(i)}
                aria-label={`Show featured phone ${i + 1} of ${count}: ${item.gadget.name}`}
                aria-current={i === current ? 'true' : undefined}
                className={`flex items-center justify-center w-7 h-10 sm:h-8 rounded-full ${focusRing}`}
              >
                <span
                  aria-hidden="true"
                  className={`block h-2.5 rounded-full transition-all ${
                    i === current ? 'w-5 bg-sage-700' : 'w-2.5 bg-slate-400 hover:bg-slate-600'
                  }`}
                />
              </button>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}

function HeroSlide({ item, active, position, selected, onToggleCompare, onAsk, onRequireSignIn }) {
  const { gadget, specs, keySpecs } = item
  const [imgError, setImgError] = useState(false)
  const showImage = gadget.image_url && !imgError
  const price = formatPeso(gadget.price_php)
  const gated = Boolean(onRequireSignIn)
  return (
    <div
      role="group"
      aria-roledescription="slide"
      aria-label={`${position}: ${gadget.name}`}
      aria-hidden={active ? undefined : true}
      inert={!active}
      className={`col-start-1 row-start-1 grid grid-cols-1 lg:grid-cols-4 gap-3.5 transition-[opacity,visibility] duration-700 ease-in-out ${
        active ? 'opacity-100 visible' : 'opacity-0 invisible'
      }`}
    >
      <article className="lg:col-span-2 relative overflow-hidden flex flex-col justify-end min-h-[340px] lg:min-h-[384px] p-6 sm:p-8 rounded-[28px] bg-white border border-slate-200">
        <div className="absolute right-6 sm:right-12 top-6 sm:top-8 w-32 sm:w-44 h-52 sm:h-72 flex items-center justify-center" aria-hidden="true">
          {showImage ? (
            <img src={gadget.image_url} alt="" className="max-w-full max-h-full object-contain" onError={() => setImgError(true)} />
          ) : (
            <PhoneGlyph className="w-full h-full opacity-90" />
          )}
        </div>
        <div className="relative max-w-[60%] sm:max-w-md">
          <span className="inline-block px-2.5 py-1 rounded-full bg-sage-700 text-white font-mono text-xs font-semibold">
            {specs.length} SOURCED SPEC{specs.length === 1 ? '' : 'S'}
          </span>
          <h2 className="mt-3 text-5xl sm:text-6xl font-extrabold tracking-[-0.055em] leading-[0.95] text-slate-900 break-words">
            {gated ? (
              <button type="button" onClick={onRequireSignIn} aria-haspopup="dialog" className={`text-left hover:underline rounded ${focusRing}`}>
                {gadget.name}
              </button>
            ) : (
              <Link to={`/gadgets/${gadget.id}`} className={`hover:underline rounded ${focusRing}`}>
                {gadget.name}
              </Link>
            )}
          </h2>
          <p className="mt-2 text-base text-slate-600">{gadget.brand}</p>
          <p className={`mt-4 font-mono text-3xl ${price ? 'text-slate-900' : 'text-slate-500 text-xl'}`}>
            <PriceTag gadget={gadget} empty="No price yet" />
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            {gated ? (
              <Button variant="primary" size="lg" onClick={onRequireSignIn} aria-haspopup="dialog">
                View specs
              </Button>
            ) : (
              <Button as={Link} to={`/gadgets/${gadget.id}`} variant="primary" size="lg">
                View specs
              </Button>
            )}
            <Button
              size="lg"
              onClick={onToggleCompare}
              aria-pressed={gated ? undefined : selected}
              aria-haspopup={gated ? 'dialog' : undefined}
              icon={selected ? BadgeCheck : Scale}
            >
              {selected ? 'In Compare' : 'Compare'}
            </Button>
            <Button
              size="lg"
              variant="ghost"
              icon={Sparkles}
              onClick={onAsk}
              aria-haspopup={gated ? 'dialog' : undefined}
              aria-label={`Ask AI about ${gadget.name}`}
            >
              Ask AI
            </Button>
          </div>
        </div>
      </article>
      <KeySpecTiles keySpecs={keySpecs} gadgetName={gadget.name} size="lg" className="lg:col-span-2" />
    </div>
  )
}

function BrandTile({ label, count, pressed, styleIndex, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={pressed}
      className={`flex items-center justify-between gap-3 text-left px-5 py-4 rounded-3xl border transition active:scale-[0.98] ${focusRing} ${
        BRAND_STYLES[styleIndex]
      } ${pressed ? 'ring-2 ring-offset-2 ring-offset-slate-50 ring-sage-700' : 'hover:opacity-90'}`}
    >
      <span className="min-w-0">
        <span className="block text-lg font-extrabold tracking-[-0.025em] truncate">{label}</span>
        <span className="font-mono text-xs opacity-80">
          {count} {count === 1 ? 'phone' : 'phones'}
        </span>
      </span>
      <ArrowRight size={18} aria-hidden="true" className="shrink-0" />
    </button>
  )
}

function FilterPill({ label, onRemove }) {
  return (
    <span className="flex items-center gap-1.5 bg-white border border-slate-200 pl-3 pr-2 py-1 rounded-full text-sm font-medium text-slate-800">
      {label}
      <button
        onClick={onRemove}
        aria-label={`Remove filter ${label}`}
        className={`text-slate-600 hover:text-slate-900 flex items-center p-1 -m-1 rounded-full ${hitArea} ${focusRing}`}
      >
        <X size={13} />
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
      className={`px-3.5 min-h-10 min-w-10 rounded-full font-mono text-sm transition-colors ${focusRing} ${
        active
          ? 'bg-inverse text-inverse-ink font-semibold'
          : 'bg-white border border-slate-200 text-slate-700 font-medium hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed'
      }`}
    >
      {children}
    </button>
  )
}

// onRequireSignIn is set for signed-out visitors: the name, View specs, Compare, Ask AI and
// Save stay visible but open the sign-in prompt instead of acting.
export function GadgetCard({ gadget, specCount, selected, onToggle, onAsk, onDeleted, mine, saving, onToggleMine, onRequireSignIn }) {
  const gated = Boolean(onRequireSignIn)
  const [imgError, setImgError] = useState(false)
  const showImage = gadget.image_url && !imgError
  const release = formatRelease(gadget.release_date)
  const price = formatPeso(gadget.price_php)

  return (
    <article
      className={`relative bg-white rounded-3xl p-3.5 border flex flex-col gap-3 transition-all group ${
        selected ? 'border-sage-700 ring-2 ring-sage-700' : 'border-slate-200 hover:border-slate-300'
      }`}
    >
      <div className="relative h-40 rounded-2xl bg-slate-100 overflow-hidden flex items-center justify-center">
        {specCount !== undefined && (
          <span
            className={`absolute left-2.5 top-2.5 px-2.5 py-1 rounded-full bg-white border border-slate-200 font-mono text-[11px] font-semibold ${
              specCount > 0 ? 'text-sage-700' : 'text-slate-500'
            }`}
          >
            {specCount > 0 ? `${specCount} sourced spec${specCount === 1 ? '' : 's'}` : 'No specs yet'}
          </span>
        )}
        {selected && (
          <span className="absolute right-2.5 top-2.5 flex items-center gap-1 px-2.5 py-1 rounded-full bg-sage-700 text-white font-mono text-[11px] font-semibold">
            <BadgeCheck size={12} aria-hidden="true" /> In Compare
          </span>
        )}
        {showImage ? (
          <img
            src={gadget.image_url}
            alt={gadget.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={() => setImgError(true)}
          />
        ) : (
          <PhoneGlyph className="w-14 h-24" />
        )}
      </div>

      <div className="min-w-0 px-1">
        <h3 className="text-lg font-extrabold tracking-[-0.03em] text-slate-900 truncate">
          {gated ? (
            <button type="button" onClick={onRequireSignIn} aria-haspopup="dialog" className={`text-left hover:underline rounded ${focusRing}`}>
              {gadget.name}
            </button>
          ) : (
            <Link to={`/gadgets/${gadget.id}`} className={`hover:underline rounded ${focusRing}`}>
              {gadget.name}
            </Link>
          )}
        </h3>
        <p className="text-sm text-slate-600 truncate">
          {gadget.brand}
          {release ? ` · ${release}` : ''}
        </p>
        <p className={`mt-1.5 font-mono ${price ? 'text-xl text-slate-900' : 'text-sm text-slate-500'}`}>
          <PriceTag gadget={gadget} empty="No price yet" />
        </p>
      </div>

      <div className="flex items-center gap-2 mt-auto">
        {gated ? (
          <Button
            variant="primary"
            size="sm"
            onClick={onRequireSignIn}
            aria-haspopup="dialog"
            aria-label={`Details for ${gadget.name}`}
            className="flex-1"
          >
            View specs
          </Button>
        ) : (
          <Button
            as={Link}
            to={`/gadgets/${gadget.id}`}
            variant="primary"
            size="sm"
            aria-label={`Details for ${gadget.name}`}
            className="flex-1"
          >
            View specs
          </Button>
        )}
        <label
          className={`flex items-center gap-2 min-h-10 sm:min-h-9 px-3.5 rounded-full border cursor-pointer select-none text-sm font-semibold focus-within:ring-2 focus-within:ring-sage-600 ${
            selected ? 'bg-sage-700 text-white border-sage-700' : 'border-slate-300 text-slate-800 hover:bg-slate-100'
          }`}
        >
          <input
            type="checkbox"
            checked={selected}
            onChange={gated ? onRequireSignIn : onToggle}
            aria-label={`Compare ${gadget.name}`}
            className="w-4 h-4 rounded accent-slate-900 focus:outline-none"
          />
          Compare
        </label>
      </div>

      <div className="flex items-center gap-1.5 border-t border-slate-200 pt-2.5">
        {/* aria-label, not an sr-only span: a span's leading space is dropped when the
            accessible name is computed, so it read "Ask AIabout …" (#207). */}
        <Button
          variant="ghost"
          size="sm"
          icon={Sparkles}
          onClick={gated ? onRequireSignIn : onAsk}
          aria-haspopup={gated ? 'dialog' : undefined}
          aria-label={`Ask AI about ${gadget.name}`}
        >
          Ask AI
        </Button>
        {mine !== null && (
          <Button
            variant="ghost"
            size="sm"
            icon={mine ? BookmarkCheck : BookmarkPlus}
            loading={saving}
            disabled={saving}
            aria-pressed={mine}
            onClick={onToggleMine}
            aria-label={`${gadget.name}: ${mine ? 'in My Gadgets, select to remove' : 'add to My Gadgets'}`}
            className={mine ? 'text-sage-700' : ''}
          >
            {mine ? 'Saved' : 'Save'}
          </Button>
        )}
        <div className="ml-auto">
          <DeleteGadgetButton gadget={gadget} onDeleted={onDeleted} size="sm" iconOnly />
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
      className="fixed bottom-5 left-1/2 -translate-x-1/2 z-20 w-[95%] max-w-4xl bg-white/95 backdrop-blur-md rounded-full p-2 pl-5 border border-slate-200 shadow-2xl animate-fade-in"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
          <span className="flex items-center gap-1.5 text-sm font-bold text-slate-900 shrink-0">
            <Scale size={17} className="text-sage-700" aria-hidden="true" /> Compare
          </span>
          {gadgets.map((g, i) => (
            <span key={g.id} className="flex items-center gap-1.5">
              {i > 0 && <span className="font-mono text-xs text-slate-500 font-bold">VS</span>}
              <span className="flex items-center gap-1.5 bg-slate-100 border border-slate-200 pl-3 pr-2 py-1 rounded-full text-slate-900 text-sm">
                <span className="font-semibold">{g.name}</span>
                <button
                  onClick={() => onRemove(g.id)}
                  aria-label={`Remove ${g.name} from comparison`}
                  className={`text-slate-600 hover:text-red-700 p-1 -m-1 transition-colors rounded-full ${hitArea} ${focusRing}`}
                >
                  <X size={12} />
                </button>
              </span>
            </span>
          ))}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={onClear}
            className={`text-sm text-slate-600 hover:text-slate-900 px-3 min-h-10 font-semibold rounded-full ${focusRing}`}
          >
            Clear ({gadgets.length})
          </button>
          <Button
            variant="primary"
            onClick={onCompare}
            disabled={!canCompare}
            title={canCompare ? undefined : 'Select at least 2 to compare'}
          >
            Compare now ({gadgets.length}) <ArrowRight size={16} aria-hidden="true" />
          </Button>
        </div>
      </div>
    </aside>
  )
}
