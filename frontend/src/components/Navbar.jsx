import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { Plus, LogIn, LogOut, Menu, X, Search, Sparkles, CornerDownLeft, User, Inbox } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../hooks/useAuth'
import { MAX_QUESTION_CHARS } from '../utils/questionLimits'
import { useCorrectionBadges } from '../hooks/useCorrectionBadges'
import logo from '../assets/logo.webp'

// On the navy bar the navy ring would vanish, so header controls use the signal yellow.
const barFocusRing = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-line-yellow'

// Small count bubble. The number is visible; srLabel says what it counts. Screen readers
// get ", 3 pending" instead: a leading space inside the badge is dropped when the link's
// name is computed, which read "Review Queue3pending" (#207). The comma keeps it apart.
function CountBadge({ count, srLabel, className = '' }) {
  if (!count) return null
  const shown = count > 99 ? '99+' : count
  return (
    <span
      className={`inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full bg-red-700 text-white text-xs font-bold leading-none ${className}`}
    >
      <span aria-hidden="true">{shown}</span>
      <span className="sr-only">{`, ${shown} ${srLabel}`}</span>
    </span>
  )
}

function decisionsLabel(count) {
  return count === 1 ? 'new decision' : 'new decisions'
}

// Rail-style "you are here": the current page sits on a lighter tile with a signal-yellow
// bar under it, like the current station on a line diagram.
function navLinkClass({ isActive }) {
  return `relative px-3.5 py-2 rounded-lg text-[15px] transition-colors ${barFocusRing} ${
    isActive
      ? 'bg-rail-800 text-white font-semibold after:absolute after:left-3 after:right-3 after:-bottom-[13px] after:h-[3px] after:rounded-full after:bg-line-yellow'
      : 'text-rail-100 hover:text-white hover:bg-rail-800'
  }`
}

function mobileLinkClass({ isActive }) {
  return `block px-3 py-2.5 rounded-lg text-base transition-colors ${barFocusRing} ${
    isActive ? 'bg-rail-800 text-white font-semibold' : 'text-rail-100 hover:text-white hover:bg-rail-800'
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
      <Search size={18} className="absolute left-3 text-rail-200 pointer-events-none z-10" />
      <label htmlFor="gadget-search" className="sr-only">
        Search gadgets by name or brand, or press Enter to ask the AI
      </label>
      <input
        id="gadget-search"
        ref={inputRef}
        type="text"
        placeholder="Search gadgets or ask a question"
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
        className="w-full bg-rail-800 text-white placeholder:text-rail-200 text-[15px] pl-10 pr-12 py-2.5 rounded-lg border border-rail-700 focus:outline-none focus:bg-rail-950 focus:border-line-yellow focus:ring-2 focus:ring-line-yellow transition-colors"
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
          className={`absolute right-2 flex items-center gap-1 text-xs font-semibold text-line-yellow-ink bg-line-yellow rounded-md px-2 py-1 min-h-10 sm:min-h-0 hover:brightness-95 transition ${barFocusRing}`}
        >
          <Sparkles size={12} /> Ask <CornerDownLeft size={12} />
        </button>
      ) : (
        <kbd className="absolute right-3 text-xs text-rail-100 bg-rail-700 px-1.5 py-0.5 rounded border border-rail-600 pointer-events-none">
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
      {user && (
        <NavLink to="/my-gadgets" className={className}>
          My Gadgets
        </NavLink>
      )}
      {isAdmin && (
        <NavLink to="/corrections" className={className}>
          Review Queue
          <CountBadge count={pendingCount} srLabel="pending" className="ml-1.5 align-text-bottom" />
        </NavLink>
      )}
    </>
  )

  return (
    <header className="sticky top-0 z-30 bg-rail-900 text-white shadow-md shadow-rail-950/20">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-3 flex flex-wrap md:flex-nowrap items-center gap-x-6 gap-y-3">
        <Link to="/" aria-label="TekaTech home" className={`shrink-0 rounded-md ${barFocusRing}`}>
          {/* White silhouette of the current mark on the navy bar, until the owner decides
              on the logo (open decision in docs/design/rebrand-brief.md). */}
          <img src={logo} alt="TekaTech" className="h-10 w-auto brightness-0 invert" />
        </Link>

        <div className="order-last w-full md:order-none md:w-auto md:flex-1 md:max-w-xl">
          <SearchBar />
        </div>

        <nav aria-label="Main" className="hidden lg:flex items-center gap-1 shrink-0">
          {renderLinks(navLinkClass)}
        </nav>

        <div className="ml-auto flex items-center gap-3 shrink-0">
          {/* The catalog is curated by admins (scope change, 3 Nov 2026): POST /gadgets is admin-only. */}
          {isAdmin && (
            <Link
              to="/add"
              aria-label="Add gadget"
              className={`flex items-center gap-2 bg-white text-rail-900 text-[15px] font-bold px-3 sm:px-4 py-2.5 min-h-10 rounded-lg hover:bg-rail-50 active:scale-95 transition ${barFocusRing} focus-visible:ring-offset-2 focus-visible:ring-offset-rail-900`}
            >
              <Plus size={18} strokeWidth={2.5} /> <span className="hidden sm:inline">Add Gadget</span>
            </Link>
          )}

          {user ? (
            <div className="hidden lg:flex items-center gap-2">
              <NavLink
                to="/my-suggestions"
                aria-label={mySuggestionsLabel}
                title={mySuggestionsLabel}
                className={({ isActive }) =>
                  `relative p-2 rounded-lg transition ${barFocusRing} ${
                    isActive ? 'bg-rail-800 text-white' : 'text-rail-200 hover:text-white hover:bg-rail-800'
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
              {/* The avatar opens the Account page (#204): email, change password. */}
              <NavLink
                to="/account"
                aria-label="Your account"
                title={`Your account: ${user.email}`}
                className={({ isActive }) =>
                  `w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition ${barFocusRing} ${
                    isActive ? 'bg-white text-rail-900' : 'bg-rail-700 text-white hover:bg-rail-600'
                  }`
                }
              >
                <User size={18} aria-hidden="true" />
              </NavLink>
              <button
                onClick={handleSignOut}
                aria-label="Log out"
                title="Log out"
                className={`p-2 text-rail-200 hover:text-white hover:bg-rail-800 rounded-lg transition ${barFocusRing}`}
              >
                <LogOut size={18} />
              </button>
            </div>
          ) : (
            <Link
              to="/login"
              className={`hidden lg:flex items-center gap-1.5 px-3.5 py-2 text-[15px] text-rail-100 hover:text-white hover:bg-rail-800 rounded-lg transition ${barFocusRing}`}
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
            className={`relative lg:hidden p-2.5 -mr-2.5 text-rail-100 hover:text-white rounded-lg transition ${barFocusRing}`}
          >
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
            {!menuOpen && menuUpdates > 0 && (
              <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-line-yellow ring-2 ring-rail-900" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      {menuOpen && (
        <div id="mobile-menu" className="lg:hidden border-t border-rail-800 px-4 py-3 space-y-1 animate-fade-in">
          <nav aria-label="Main" className="space-y-1">
            {renderLinks(mobileLinkClass)}
          </nav>
          <div className="border-t border-rail-800 mt-2 pt-2">
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
            {user && (
              <NavLink to="/account" className={mobileLinkClass}>
                Account
              </NavLink>
            )}
            {user ? (
              <div className="flex items-center justify-between gap-2 px-3">
                <span className="text-sm text-rail-200 truncate">Signed in as {user.email}</span>
                <button
                  onClick={handleSignOut}
                  className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap min-h-10 px-2 -mr-2 text-sm text-rail-100 hover:text-white rounded-md transition ${barFocusRing}`}
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
