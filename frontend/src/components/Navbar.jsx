import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { Plus, LogIn, LogOut, Menu, X, Search, Sparkles, CornerDownLeft, User, Inbox, Moon, Sun, Cpu } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../hooks/useAuth'
import { MAX_QUESTION_CHARS } from '../utils/questionLimits'
import { useCorrectionBadges } from '../hooks/useCorrectionBadges'
import { useTheme } from '../hooks/useTheme'
import ConfirmDialog from './ui/ConfirmDialog'

const focusRing = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage-600'

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

function navLinkClass({ isActive }) {
  return `px-3.5 py-1.5 rounded-full text-sm font-semibold transition-colors ${focusRing} ${
    isActive
      ? 'bg-inverse text-inverse-ink'
      : 'text-slate-600 hover:text-slate-900 hover:bg-white'
  }`
}

function mobileLinkClass({ isActive }) {
  return `block px-3 py-2.5 rounded-lg text-base transition-colors ${focusRing} ${
    isActive ? 'bg-inverse text-inverse-ink font-semibold' : 'text-slate-700 hover:bg-slate-100'
  }`
}

// How long typing must pause before the text is written to ?q=.
const SEARCH_SYNC_DELAY_MS = 250
const AUTH_PAGES = ['/login', '/forgot-password', '/reset-password']

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
  const { user } = useAuth()
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
    // Asking the AI needs an account (owner decision, 14 Nov 2026); searching by name does not.
    // Log in, then come back to this page. The question is dropped, not carried in the URL
    // (?ask= / ?q=) or the return address.
    if (!user) {
      setText('')
      setSynced('')
      // ?q= mirrors this box, which now holds the question (or a debounced part of it).
      const params = new URLSearchParams(location.search)
      params.delete('ask')
      params.delete('q')
      const search = params.toString()
      toast('Log in to ask the AI.')
      navigate('/login', {
        state: { from: { pathname: location.pathname, search: search ? `?${search}` : '', hash: location.hash } },
      })
      return
    }
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
        placeholder="Search phones, or ask a question and press Enter"
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
        className="w-full bg-slate-100 text-slate-900 placeholder:text-slate-500 text-[15px] pl-10 pr-12 py-2.5 rounded-full border border-slate-200 focus:outline-none focus:border-sage-600 focus:ring-1 focus:ring-sage-600 transition-all"
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
          className={`absolute right-2 flex items-center gap-1 text-xs font-bold text-white bg-sage-700 rounded-full px-3 py-1 min-h-10 sm:min-h-0 hover:bg-sage-800 transition ${focusRing}`}
        >
          <Sparkles size={12} /> Ask <CornerDownLeft size={12} />
        </button>
      ) : (
        <kbd className="absolute right-3 font-mono text-xs text-slate-500 bg-white px-1.5 py-0.5 rounded-md border border-slate-200 pointer-events-none">
          /
        </kbd>
      )}
    </div>
  )
}

function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const dark = theme !== 'light'
  const label = dark ? 'Switch to light mode' : 'Switch to dark mode'
  return (
    <button
      type="button"
      onClick={() => setTheme(dark ? 'light' : 'dark')}
      aria-label={label}
      title={label}
      className={`w-10 h-10 rounded-full flex items-center justify-center border border-slate-200 text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition ${focusRing}`}
    >
      {dark ? <Sun size={18} aria-hidden="true" /> : <Moon size={18} aria-hidden="true" />}
    </button>
  )
}

function Navbar() {
  const navigate = useNavigate()
  const location = useLocation()
  // Log In remembers this page, to return after logging in or confirming a new account (#196).
  // Not from the log-in and password pages themselves, which would send the user back to them.
  const loginState = AUTH_PAGES.includes(location.pathname) ? undefined : { from: location }
  const { user, signOut } = useAuth()
  const isAdmin = user?.app_metadata?.is_admin
  const { unseenDecisions, pendingCount } = useCorrectionBadges(user, location.pathname)
  const mySuggestionsLabel = unseenDecisions
    ? `My suggestions, ${unseenDecisions} ${decisionsLabel(unseenDecisions)}`
    : 'My suggestions'
  const menuUpdates = unseenDecisions + pendingCount
  const [menuOpen, setMenuOpen] = useState(false)
  const [lastPath, setLastPath] = useState(location.pathname)
  // Log out asks first (owner decision, 14 Nov 2026); only "Log out" in the dialog signs out.
  const [confirmLogout, setConfirmLogout] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const [signOutError, setSignOutError] = useState(null)

  // Close the mobile menu whenever the route changes.
  if (lastPath !== location.pathname) {
    setLastPath(location.pathname)
    setMenuOpen(false)
  }

  useEffect(() => {
    if (!menuOpen) return
    function handleKey(e) {
      // Escape in the log-out dialog closes only the dialog, so focus can return to the menu.
      if (e.key === 'Escape' && !confirmLogout) setMenuOpen(false)
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [menuOpen, confirmLogout])

  function askToSignOut() {
    setSignOutError(null)
    setConfirmLogout(true)
  }

  function cancelSignOut() {
    setConfirmLogout(false)
    setSignOutError(null)
  }

  async function handleSignOut() {
    setSigningOut(true)
    setSignOutError(null)
    try {
      await signOut()
    } catch {
      setSignOutError("We couldn't log you out. Check your connection, then try again.")
      setSigningOut(false)
      return
    }
    setSigningOut(false)
    setConfirmLogout(false)
    setMenuOpen(false)
    toast.success('Logged out')
    navigate('/')
  }

  const renderLinks = (className) => (
    <>
      <NavLink to="/" end className={className}>
        Phones
      </NavLink>
      {/* Comparing needs an account (owner, 14 Nov 2026); visitors only browse the catalog. */}
      {user && (
        <NavLink to="/compare" className={className}>
          Compare
        </NavLink>
      )}
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
      {isAdmin && (
        <NavLink to="/admin" className={className}>
          Overview
        </NavLink>
      )}
    </>
  )

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-[1320px] mx-auto px-4 sm:px-6 py-2.5 flex flex-wrap md:flex-nowrap items-center gap-x-4 gap-y-2.5">
        <Link to="/" aria-label="TekaTech home" className={`shrink-0 flex items-center gap-2 rounded-lg ${focusRing}`}>
          <span className="w-9 h-9 rounded-[10px] bg-sage-700 text-white flex items-center justify-center" aria-hidden="true">
            <Cpu size={19} strokeWidth={2.4} />
          </span>
          <span className="text-xl font-extrabold tracking-[-0.03em] text-slate-900">TekaTech</span>
        </Link>

        <div className="order-last w-full md:order-none md:w-auto md:flex-1 md:max-w-md">
          <SearchBar />
        </div>

        <nav aria-label="Main" className="hidden lg:flex items-center gap-1 shrink-0 p-1 rounded-full bg-slate-100">
          {renderLinks(navLinkClass)}
        </nav>

        <div className="ml-auto flex items-center gap-2 shrink-0">
          <ThemeToggle />
          {/* The catalog is curated by admins (scope change, 3 Nov 2026): POST /gadgets is admin-only. */}
          {isAdmin && (
            <Link
              to="/add"
              aria-label="Add phone"
              className={`flex items-center gap-2 bg-sage-700 text-white text-sm font-bold px-3 sm:px-4 py-2 min-h-10 rounded-full hover:bg-sage-800 active:scale-95 transition ${focusRing} focus-visible:ring-offset-2`}
            >
              <Plus size={18} strokeWidth={2.5} /> <span className="hidden sm:inline">Add Phone</span>
            </Link>
          )}

          {user ? (
            <div className="hidden lg:flex items-center gap-2">
{/* The signed-in email lives on the Account page and in its tooltip (rebrand: a compact header). */}
              <NavLink
                to="/my-suggestions"
                aria-label={mySuggestionsLabel}
                title={mySuggestionsLabel}
                className={({ isActive }) =>
                  `relative p-2 rounded-full transition ${focusRing} ${
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
              {/* The avatar opens the Account page (#204): email, change password. */}
              <NavLink
                to="/account"
                aria-label="Your account"
                title={`Your account (${user.email})`}
                className={({ isActive }) =>
                  `w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition ${focusRing} ${
                    isActive ? 'bg-sage-700 text-white ring-2 ring-sage-300' : 'bg-inverse text-inverse-ink hover:opacity-90'
                  }`
                }
              >
                <User size={18} aria-hidden="true" />
              </NavLink>
              <button
                type="button"
                onClick={askToSignOut}
                aria-label="Log out"
                title="Log out"
                className={`p-2 text-slate-500 hover:text-red-600 rounded-full transition ${focusRing}`}
              >
                <LogOut size={18} />
              </button>
            </div>
          ) : (
            <Link
              to="/login"
              state={loginState}
              className={`hidden lg:flex items-center gap-1.5 px-4 py-2 min-h-10 text-sm font-bold bg-inverse text-inverse-ink hover:opacity-90 rounded-full transition ${focusRing}`}
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
            {user && (
              <NavLink to="/account" className={mobileLinkClass}>
                Account
              </NavLink>
            )}
            {user ? (
              <div className="flex items-center justify-between gap-2 px-3">
                <span className="text-sm text-slate-500 truncate">Signed in as {user.email}</span>
                <button
                  type="button"
                  onClick={askToSignOut}
                  className={`flex items-center gap-1.5 min-h-10 px-2 -mr-2 text-sm text-slate-600 hover:text-red-600 rounded-md transition ${focusRing}`}
                >
                  <LogOut size={16} /> Log Out
                </button>
              </div>
            ) : (
              <NavLink to="/login" state={loginState} className={mobileLinkClass}>
                Log In
              </NavLink>
            )}
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmLogout}
        title="Log out of TekaTech?"
        description="You can log back in at any time. Without an account you can still browse the catalog."
        confirmLabel="Log out"
        busyLabel="Logging out…"
        busy={signingOut}
        error={signOutError}
        onConfirm={handleSignOut}
        onCancel={cancelSignOut}
      />
    </header>
  )
}

export default Navbar
