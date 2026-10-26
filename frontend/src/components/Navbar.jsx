import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { Plus, LogIn, LogOut, Menu, X, Search, Sparkles, CornerDownLeft, User, Inbox } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../hooks/useAuth'
import { MAX_QUESTION_CHARS } from '../utils/questionLimits'
import { useCorrectionBadges } from '../hooks/useCorrectionBadges'
import logo from '../assets/logo.webp'

const focusRing = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage-600'

// Small count bubble. The number is visible; srLabel says what it counts.
function CountBadge({ count, srLabel, className = '' }) {
  if (!count) return null
  return (
    <span
      className={`inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full bg-red-700 text-white text-xs font-bold leading-none ${className}`}
    >
      {count > 99 ? '99+' : count}
      <span className="sr-only"> {srLabel}</span>
    </span>
  )
}

function decisionsLabel(count) {
  return count === 1 ? 'new decision' : 'new decisions'
}

function navLinkClass({ isActive }) {
  return `px-3.5 py-2 rounded-lg text-[15px] transition-colors ${focusRing} ${
    isActive
      ? 'bg-sage-400 text-sage-900 font-semibold'
      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
  }`
}

function mobileLinkClass({ isActive }) {
  return `block px-3 py-2.5 rounded-lg text-base transition-colors ${focusRing} ${
    isActive ? 'bg-sage-50 text-sage-700 font-semibold' : 'text-slate-700 hover:bg-slate-100'
  }`
}

// How long typing must pause before the text is written to ?q=.
const SEARCH_SYNC_DELAY_MS = 250

// The catalog's search lives in the URL (?q= filters, ?ask= opens the AI answer),
// so this bar can drive the catalog from any page.
//
// While typing, local state is the source of truth and the URL follows (debounced,
// and immediately on Enter or blur). Binding the input straight to ?q= dropped
// letters on fast typing, because each keystroke waited for a navigation to re-render.
// `synced` is the value the URL has or is about to have: a URL change that differs
// from it came from outside (back/forward, "Clear filters") and replaces the text;
// one that matches it is our own write arriving late and must not clobber newer typing.
function SearchBar() {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const inputRef = useRef(null)
  const onCatalog = location.pathname === '/'
  const urlQuery = onCatalog ? (searchParams.get('q') ?? '') : ''
  const [query, setText] = useState(urlQuery)
  const [synced, setSynced] = useState(urlQuery)
  const [seenUrlQuery, setSeenUrlQuery] = useState(urlQuery)

  if (seenUrlQuery !== urlQuery) {
    setSeenUrlQuery(urlQuery)
    if (urlQuery !== synced) {
      setText(urlQuery)
      setSynced(urlQuery)
    }
  }

  useEffect(() => {
    if (query === synced) return undefined
    const timer = window.setTimeout(() => {
      setSynced(query)
      const params = new URLSearchParams(onCatalog ? searchParams : undefined)
      if (query) params.set('q', query)
      else params.delete('q')
      navigate({ pathname: '/', search: params.toString() }, { replace: onCatalog })
    }, SEARCH_SYNC_DELAY_MS)
    return () => window.clearTimeout(timer)
  }, [query, synced, onCatalog, searchParams, navigate])

  useEffect(() => {
    function handleKey(e) {
      const tag = document.activeElement?.tagName
      if (e.key === '/' && tag !== 'INPUT' && tag !== 'TEXTAREA' && tag !== 'SELECT') {
        e.preventDefault()
        inputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [])

  function goToCatalog(update) {
    const params = new URLSearchParams(onCatalog ? searchParams : undefined)
    update(params)
    navigate({ pathname: '/', search: params.toString() }, { replace: onCatalog })
  }

  // Writes pending text to the URL now instead of waiting for the debounce.
  function flushQuery() {
    if (query === synced) return
    setSynced(query)
    goToCatalog((params) => (query ? params.set('q', query) : params.delete('q')))
  }

  function ask() {
    const question = query.trim()
    if (!question) return
    // The typed text becomes the question, not a name filter: keeping it as
    // ?q= would filter the catalog by the whole sentence and match nothing.
    setText('')
    setSynced('')
    goToCatalog((params) => {
      params.delete('q')
      params.set('ask', question)
    })
  }

  return (
    <div className="relative flex items-center w-full">
      <Search size={18} className="absolute left-3 text-slate-500 pointer-events-none" />
      <label htmlFor="gadget-search" className="sr-only">
        Search gadgets by name or brand, or press Enter to ask the AI
      </label>
      <input
        id="gadget-search"
        ref={inputRef}
        type="text"
        placeholder="Search gadgets, or ask a question and press Enter"
        maxLength={MAX_QUESTION_CHARS}
        value={query}
        onChange={(e) => setText(e.target.value)}
        onBlur={flushQuery}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            ask()
          }
        }}
        className="w-full bg-slate-100 text-slate-900 placeholder:text-slate-500 text-[15px] pl-10 pr-12 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:border-sage-600 focus:bg-white focus:ring-1 focus:ring-sage-600 transition-all"
      />
      {query.trim() ? (
        <button
          type="button"
          // Keeps focus in the input, so a click doesn't first blur-flush ?q= and
          // then navigate a second time for the question.
          onMouseDown={(e) => e.preventDefault()}
          onClick={ask}
          aria-label="Ask the AI"
          title="Ask the AI"
          className={`absolute right-2 flex items-center gap-1 text-xs font-semibold text-sage-700 bg-sage-50 border border-sage-200 rounded-md px-2 py-1 min-h-10 sm:min-h-0 hover:bg-sage-200 transition ${focusRing}`}
        >
          <Sparkles size={12} /> Ask <CornerDownLeft size={12} />
        </button>
      ) : (
        <kbd className="absolute right-3 text-xs text-slate-500 bg-white px-1.5 py-0.5 rounded border border-slate-200 pointer-events-none">
          /
        </kbd>
      )}
    </div>
  )
}

function Navbar() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, signOut } = useAuth()
  const isAdmin = user?.app_metadata?.is_admin
  const { unseenDecisions, pendingCount } = useCorrectionBadges(user, location.pathname)
  const mySuggestionsLabel = unseenDecisions
    ? `My suggestions, ${unseenDecisions} ${decisionsLabel(unseenDecisions)}`
    : 'My suggestions'
  const menuUpdates = unseenDecisions + pendingCount
  const [menuOpen, setMenuOpen] = useState(false)
  const [lastPath, setLastPath] = useState(location.pathname)

  // Close the mobile menu whenever the route changes.
  if (lastPath !== location.pathname) {
    setLastPath(location.pathname)
    setMenuOpen(false)
  }

  useEffect(() => {
    if (!menuOpen) return
    function handleKey(e) {
      if (e.key === 'Escape') setMenuOpen(false)
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [menuOpen])

  async function handleSignOut() {
    setMenuOpen(false)
    await signOut()
    toast.success('Logged out')
    navigate('/')
  }

  const renderLinks = (className) => (
    <>
      <NavLink to="/" end className={className}>
        Catalog
      </NavLink>
      <NavLink to="/compare" className={className}>
        Compare
      </NavLink>
      {isAdmin && (
        <NavLink to="/corrections" className={className}>
          Review Queue
          <CountBadge count={pendingCount} srLabel="pending" className="ml-1.5 align-text-bottom" />
        </NavLink>
      )}
    </>
  )

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-3 flex flex-wrap md:flex-nowrap items-center gap-x-6 gap-y-3">
        <Link to="/" aria-label="TekaTech home" className={`shrink-0 rounded-md ${focusRing}`}>
          <img src={logo} alt="TekaTech" className="h-10 w-auto" />
        </Link>

        <div className="order-last w-full md:order-none md:w-auto md:flex-1 md:max-w-xl">
          <SearchBar />
        </div>

        <nav aria-label="Main" className="hidden lg:flex items-center gap-1 shrink-0">
          {renderLinks(navLinkClass)}
        </nav>

        <div className="ml-auto flex items-center gap-3 shrink-0">
          <Link
            to="/add"
            aria-label="Add gadget"
            className={`flex items-center gap-2 bg-sage-700 text-white text-[15px] font-bold px-3 sm:px-5 py-2.5 rounded-lg shadow-md shadow-sage-700/25 ring-2 ring-sage-400/50 hover:bg-sage-800 hover:shadow-lg active:scale-95 transition ${focusRing} focus-visible:ring-offset-2`}
          >
            <Plus size={18} strokeWidth={2.5} /> <span className="hidden sm:inline">Add Gadget</span>
          </Link>

          {user ? (
            <div className="hidden lg:flex items-center gap-2">
              <div className="hidden xl:flex items-center gap-2 bg-slate-100 border border-slate-200 text-slate-600 text-sm px-3 py-1.5 rounded-lg max-w-[260px]">
                <span className="w-2 h-2 rounded-full bg-emerald-600 shrink-0" />
                <span className="truncate" title={user.email}>
                  Signed in as <strong className="text-slate-900 font-semibold">{user.email}</strong>
                </span>
              </div>
              <NavLink
                to="/my-suggestions"
                aria-label={mySuggestionsLabel}
                title={mySuggestionsLabel}
                className={({ isActive }) =>
                  `relative p-2 rounded-lg transition ${focusRing} ${
                    isActive ? 'bg-sage-50 text-sage-700' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                  }`
                }
              >
                <Inbox size={18} aria-hidden="true" />
                <CountBadge
                  count={unseenDecisions}
                  srLabel={decisionsLabel(unseenDecisions)}
                  className="absolute -top-1 -right-1"
                />
              </NavLink>
              <span
                className="w-9 h-9 rounded-full bg-sage-700 text-white flex items-center justify-center shrink-0"
                title={user.email}
                aria-hidden="true"
              >
                <User size={18} />
              </span>
              <button
                onClick={handleSignOut}
                aria-label="Log out"
                title="Log out"
                className={`p-2 text-slate-500 hover:text-red-600 rounded-lg transition ${focusRing}`}
              >
                <LogOut size={18} />
              </button>
            </div>
          ) : (
            <Link
              to="/login"
              className={`hidden lg:flex items-center gap-1.5 px-3.5 py-2 text-[15px] text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition ${focusRing}`}
            >
              <LogIn size={18} /> Log In
            </Link>
          )}

          <button
            onClick={() => setMenuOpen((o) => !o)}
            aria-label={
              menuOpen ? 'Close menu' : menuUpdates ? `Open menu, ${menuUpdates} new ${menuUpdates === 1 ? 'update' : 'updates'}` : 'Open menu'
            }
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            className={`relative lg:hidden p-2.5 -mr-2.5 text-slate-600 hover:text-slate-900 rounded-lg transition ${focusRing}`}
          >
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
            {!menuOpen && menuUpdates > 0 && (
              <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-red-700 ring-2 ring-white" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      {menuOpen && (
        <div id="mobile-menu" className="lg:hidden border-t border-slate-200 px-4 py-3 space-y-1 animate-fade-in">
          <nav aria-label="Main" className="space-y-1">
            {renderLinks(mobileLinkClass)}
          </nav>
          <div className="border-t border-slate-200 mt-2 pt-2">
            {user && (
              <NavLink to="/my-suggestions" className={mobileLinkClass}>
                My Suggestions
                <CountBadge
                  count={unseenDecisions}
                  srLabel={decisionsLabel(unseenDecisions)}
                  className="ml-1.5 align-text-bottom"
                />
              </NavLink>
            )}
            {user ? (
              <div className="flex items-center justify-between gap-2 px-3">
                <span className="text-sm text-slate-500 truncate">Signed in as {user.email}</span>
                <button
                  onClick={handleSignOut}
                  className={`flex items-center gap-1.5 min-h-10 px-2 -mr-2 text-sm text-slate-600 hover:text-red-600 rounded-md transition ${focusRing}`}
                >
                  <LogOut size={16} /> Log Out
                </button>
              </div>
            ) : (
              <NavLink to="/login" className={mobileLinkClass}>
                Log In
              </NavLink>
            )}
          </div>
        </div>
      )}
    </header>
  )
}

export default Navbar
