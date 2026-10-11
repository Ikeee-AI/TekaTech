import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Search, Sparkles, CornerDownLeft, LayoutGrid, List, GitCompare, Check, PackagePlus, SearchX, ImageOff } from 'lucide-react'
import toast from 'react-hot-toast'
import { api } from '../api/client'
import EmptyState from '../components/EmptyState'
import { GadgetGridSkeleton } from '../components/Skeleton'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import AIAnswerPanel from '../components/AIAnswerPanel'
import TrendingQuestions from '../components/TrendingQuestions'

const SUGGESTED_QUESTIONS = [
  'Which gadget has the best battery life?',
  'What phones support fast charging?',
  'Compare display quality across gadgets',
]

export default function GadgetList() {
  useDocumentTitle('Catalog')
  const [gadgets, setGadgets] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [query, setQuery] = useState('')
  const [askedQuestion, setAskedQuestion] = useState(null)
  const [activeCategory, setActiveCategory] = useState('All')
  const [sortBy, setSortBy] = useState('name')
  const [view, setView] = useState('grid')
  const [selected, setSelected] = useState(new Set())
  const navigate = useNavigate()
  const searchInputRef = useRef(null)
  const [coverage, setCoverage] = useState(null)

  useEffect(() => {
    api.getGadgets().then(setGadgets).catch((err) => setError(err.message)).finally(() => setLoading(false))
  }, [])

  useEffect(() => {
  api.getSpecCoverage().then(setCoverage).catch(() => {})
}, [])

  useEffect(() => {
    function handleKey(e) {
      const tag = document.activeElement?.tagName
      if (e.key === '/' && tag !== 'INPUT' && tag !== 'TEXTAREA') {
        e.preventDefault()
        searchInputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [])

  const categories = useMemo(() => ['All', ...new Set(gadgets.map((g) => g.category))], [gadgets])

  const filtered = useMemo(() => {
    let list = gadgets.filter((g) => {
      const matchesCategory = activeCategory === 'All' || g.category === activeCategory
      const matchesQuery =
        g.name.toLowerCase().includes(query.toLowerCase()) ||
        g.brand.toLowerCase().includes(query.toLowerCase())
      return matchesCategory && matchesQuery
    })
    if (sortBy === 'price-low') list = [...list].sort((a, b) => (a.price_php ?? 0) - (b.price_php ?? 0))
    else if (sortBy === 'price-high') list = [...list].sort((a, b) => (b.price_php ?? 0) - (a.price_php ?? 0))
    else list = [...list].sort((a, b) => a.name.localeCompare(b.name))
    return list
  }, [gadgets, query, activeCategory, sortBy])

  function toggleSelect(id) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        if (next.size >= 3) {
          toast.error('You can compare up to 3 gadgets at a time')
          return prev
        }
        next.add(id)
      }
      return next
    })
  }

  function clearFilters() {
    setQuery('')
    setActiveCategory('All')
  }

  function handleAskKeyDown(e) {
    if (e.key === 'Enter' && query.trim()) {
      e.preventDefault()
      setAskedQuestion(query.trim())
    }
  }

  if (loading) return <GadgetGridSkeleton />
  if (error) return <p className="text-red-600">Error: {error}</p>

  if (gadgets.length === 0) {
    return (
      <EmptyState
        icon={PackagePlus}
        title="Welcome to TekaTech"
        description="Your gadget catalog is empty. Add your first device to start building spec-grounded comparisons."
        action={
          <Link
            to="/add"
            className="inline-flex items-center gap-1.5 bg-teal-600 text-white text-sm font-medium px-4 py-2 rounded-md hover:bg-teal-700 active:scale-95 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 focus-visible:ring-offset-2"
          >
            Add your first gadget
          </Link>
        }
      />
    )
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-2xl sm:text-3xl font-medium text-gray-900 tracking-tight">
          Know your next gadget, spec by spec.
        </h1>
        <p className="text-sm text-gray-500 mt-1.5">
          {gadgets.length} gadget{gadgets.length === 1 ? '' : 's'} across {categories.length - 1} categor
          {categories.length - 1 === 1 ? 'y' : 'ies'} — search, compare, decide.
        </p>
      </div>

      <div className="flex items-center gap-3 bg-white border border-gray-200 rounded-lg px-4 py-3 mb-1 transition-shadow focus-within:shadow-md focus-within:ring-2 focus-within:ring-teal-400">
        <Search size={18} className="text-gray-400 shrink-0" />
        <label htmlFor="gadget-search" className="sr-only">
          Search gadgets by name or brand, or press Enter to ask the AI
        </label>
        <input
          id="gadget-search"
          ref={searchInputRef}
          type="text"
          placeholder="Search by name/brand, or type a question and press Enter"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleAskKeyDown}
          className="flex-1 text-sm outline-none placeholder:text-gray-400"
        />
        {query.trim() ? (
          <button
            onClick={() => setAskedQuestion(query.trim())}
            className="hidden sm:flex items-center gap-1 text-[11px] font-medium text-teal-600 bg-teal-50 rounded px-1.5 py-0.5 shrink-0 hover:bg-teal-100 transition"
          >
            <Sparkles size={11} /> Ask AI <CornerDownLeft size={10} />
          </button>
        ) : (
          <kbd className="hidden sm:inline-block text-[10px] font-mono text-gray-400 bg-gray-50 border border-gray-200 rounded px-1.5 py-0.5 shrink-0">
            /
          </kbd>
        )}
      </div>

      {coverage && coverage.total > 0 && coverage.covered < coverage.total && (
        <p className="text-xs text-amber-600 mb-1">
          {coverage.covered} of {coverage.total} gadgets have specs added — AI answers may be limited for the rest.
       </p>
      )}


      <p className="text-xs text-gray-400 mb-4">
        Typing filters the list instantly. Press <span className="font-mono">Enter</span> to ask the AI a real question instead.
      </p>

      {!askedQuestion && <TrendingQuestions onSelect={setAskedQuestion} />}

      {!askedQuestion && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {SUGGESTED_QUESTIONS.map((q) => (
            <button
              key={q}
              onClick={() => setAskedQuestion(q)}
              className="text-xs font-medium text-teal-700 bg-teal-50 hover:bg-teal-100 rounded-full px-2.5 py-1 transition active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400"
            >
              {q}
            </button>
          ))}
        </div>
      )}

      {askedQuestion && <AIAnswerPanel question={askedQuestion} onClose={() => setAskedQuestion(null)} />}

      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
        <div className="flex gap-2 flex-wrap" role="group" aria-label="Filter by category">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              aria-pressed={activeCategory === cat}
              className={`text-xs font-medium px-3 py-1.5 rounded-full border transition active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 focus-visible:ring-offset-1 ${
                activeCategory === cat
                  ? 'bg-teal-50 text-teal-700 border-teal-200'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="sort-select" className="sr-only">
            Sort gadgets
          </label>
          <select
            id="sort-select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="text-xs border border-gray-200 rounded-md px-2 py-1.5 text-gray-600 transition hover:border-gray-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400"
          >
            <option value="name">Sort: name</option>
            <option value="price-low">Sort: price low to high</option>
            <option value="price-high">Sort: price high to low</option>
          </select>
          <button
            onClick={() => setView('grid')}
            aria-label="Grid view"
            aria-pressed={view === 'grid'}
            className={`p-1.5 rounded-md border transition active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 ${view === 'grid' ? 'border-teal-200 bg-teal-50 text-teal-700' : 'border-gray-200 text-gray-500'}`}
          >
            <LayoutGrid size={16} />
          </button>
          <button
            onClick={() => setView('list')}
            aria-label="List view"
            aria-pressed={view === 'list'}
            className={`p-1.5 rounded-md border transition active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 ${view === 'list' ? 'border-teal-200 bg-teal-50 text-teal-700' : 'border-gray-200 text-gray-500'}`}
          >
            <List size={16} />
          </button>
        </div>
      </div>

      {selected.size > 0 && (
        <div className="flex items-center justify-between bg-teal-50 border border-teal-200 rounded-lg px-4 py-2.5 mb-4 animate-fade-in">
          <span className="text-sm text-teal-700 flex items-center gap-2">
            <GitCompare size={16} /> {selected.size} selected for comparison
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setSelected(new Set())}
              className="text-xs font-medium px-3 py-1.5 rounded-md border border-gray-200 bg-white hover:bg-gray-50 transition active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400"
            >
              Clear
            </button>
            <button
              disabled={selected.size < 2}
              onClick={() => navigate(`/compare?ids=${[...selected].join(',')}`)}
              title={selected.size < 2 ? 'Select at least 2 to compare' : undefined}
              className="text-xs font-medium px-3 py-1.5 rounded-md border border-teal-300 text-teal-700 bg-white hover:bg-teal-50 active:scale-95 disabled:opacity-50 disabled:hover:bg-white disabled:active:scale-100 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400"
            >
              Compare →
            </button>
          </div>
        </div>
      )}

      {filtered.length === 0 ? (
        <EmptyState
          icon={SearchX}
          title="No gadgets match your filters"
          description={`Nothing found for "${query || activeCategory}". Try a different search or clear your filters.`}
          action={
            <button
              onClick={clearFilters}
              className="text-sm font-medium px-4 py-2 rounded-md border border-gray-200 hover:bg-gray-50 transition active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400"
            >
              Clear filters
            </button>
          }
        />
      ) : view === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((g) => (
            <GadgetCard key={g.id} gadget={g} selected={selected.has(g.id)} onToggle={() => toggleSelect(g.id)} />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((g) => (
            <GadgetListRow key={g.id} gadget={g} selected={selected.has(g.id)} onToggle={() => toggleSelect(g.id)} />
          ))}
        </div>
      )}
    </div>
  )
}

function handleSelectKey(e, onToggle) {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault()
    onToggle()
  }
}

function GadgetCard({ gadget, selected, onToggle }) {
  const [imgError, setImgError] = useState(false)
  const showImage = gadget.image_url && !imgError

  return (
    <div
      onClick={onToggle}
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      aria-label={`${gadget.name}, ${selected ? 'selected' : 'not selected'} for comparison`}
      onKeyDown={(e) => handleSelectKey(e, onToggle)}
      className={`relative cursor-pointer bg-white border rounded-xl p-4 transition-all duration-200 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 focus-visible:ring-offset-2 ${
        selected
          ? 'border-2 border-teal-500 bg-teal-50/40'
          : 'border-gray-200 hover:border-teal-300 hover:shadow-md hover:-translate-y-0.5'
      }`}
    >
      {selected && (
        <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-teal-600 flex items-center justify-center z-10">
          <Check size={12} className="text-white" />
        </div>
      )}
      <div className="h-28 w-full bg-gray-50 rounded-lg overflow-hidden mb-3 flex items-center justify-center">
        {showImage ? (
          <img
            src={gadget.image_url}
            alt={gadget.name}
            className="h-full w-full object-cover"
            onError={() => setImgError(true)}
          />
        ) : (
          <ImageOff size={22} className="text-gray-300" />
        )}
      </div>
      <p className="text-xs font-medium text-teal-600 uppercase">{gadget.category}</p>
      <h2 className="text-lg font-semibold text-gray-900 mt-1">{gadget.name}</h2>
      <p className="text-sm text-gray-500">{gadget.brand}</p>
      <div className="flex items-center justify-between mt-2">
        {gadget.price_php ? (
          <p className="text-sm font-medium text-gray-900">₱{gadget.price_php.toLocaleString()}</p>
        ) : (
          <span />
        )}
        <Link
          to={`/gadgets/${gadget.id}`}
          onClick={(e) => e.stopPropagation()}
          className="text-xs text-teal-600 hover:underline rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400"
        >
          View →
        </Link>
      </div>
    </div>
  )
}

function GadgetListRow({ gadget, selected, onToggle }) {
  const [imgError, setImgError] = useState(false)
  const showImage = gadget.image_url && !imgError

  return (
    <div
      onClick={onToggle}
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      aria-label={`${gadget.name}, ${selected ? 'selected' : 'not selected'} for comparison`}
      onKeyDown={(e) => handleSelectKey(e, onToggle)}
      className={`flex items-center gap-4 cursor-pointer bg-white border rounded-lg px-4 py-3 transition-all duration-200 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 focus-visible:ring-offset-2 ${
        selected ? 'border-2 border-teal-500 bg-teal-50/40' : 'border-gray-200 hover:border-teal-300 hover:shadow-sm'
      }`}
    >
      <div className="h-12 w-12 shrink-0 bg-gray-50 rounded-md overflow-hidden flex items-center justify-center">
        {showImage ? (
          <img
            src={gadget.image_url}
            alt={gadget.name}
            className="h-full w-full object-cover"
            onError={() => setImgError(true)}
          />
        ) : (
          <ImageOff size={16} className="text-gray-300" />
        )}
      </div>
      <div className="flex-1">
        <Link
          to={`/gadgets/${gadget.id}`}
          onClick={(e) => e.stopPropagation()}
          className="font-semibold text-gray-900 hover:underline rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400"
        >
          {gadget.name}
        </Link>
        <p className="text-xs text-gray-500">
          {gadget.brand} · {gadget.category}
        </p>
      </div>
      {gadget.price_php && <span className="text-sm font-medium text-gray-900">₱{gadget.price_php.toLocaleString()}</span>}
      {selected && <Check size={16} className="text-teal-600" />}
    </div>
  )
}