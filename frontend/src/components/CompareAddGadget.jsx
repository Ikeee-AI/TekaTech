import { useEffect, useId, useRef, useState } from 'react'
import { Plus, Search, X } from 'lucide-react'
import { api } from '../api/client'
import { friendlyError } from '../utils/requestErrors'
import Button from './ui/Button'

/**
 * "Add Gadget" on the Compare page (#203): an inline panel to search the catalog and
 * add one more gadget without leaving the page. The page owns ?ids=; this only reports
 * the picked gadget through onAdd. The catalog loads when the panel first opens.
 * Escape or Close shuts the panel and returns focus to the button. After a pick the page
 * reloads, so the page moves focus itself; buttonRef lets it reach this button.
 */
export default function CompareAddGadget({ excludeIds, onAdd, buttonRef }) {
  const [open, setOpen] = useState(false)
  const [catalog, setCatalog] = useState({ status: 'idle', gadgets: [], error: null })
  const [query, setQuery] = useState('')
  const panelId = useId()
  const searchId = useId()
  const toggleRef = useRef(null)
  const searchRef = useRef(null)

  useEffect(() => {
    if (open) searchRef.current?.focus()
  }, [open])

  function load() {
    setCatalog({ status: 'loading', gadgets: [], error: null })
    api
      .getGadgets()
      .then((gadgets) => setCatalog({ status: 'ready', gadgets, error: null }))
      .catch((err) => setCatalog({ status: 'error', gadgets: [], error: friendlyError(err) }))
  }

  function openPanel() {
    setOpen(true)
    if (catalog.status === 'idle' || catalog.status === 'error') load()
  }

  function close() {
    setOpen(false)
    setQuery('')
    toggleRef.current?.focus()
  }

  const q = query.trim().toLowerCase()
  const choices = catalog.gadgets.filter(
    (g) => !excludeIds.includes(g.id) && (!q || `${g.name} ${g.brand} ${g.category}`.toLowerCase().includes(q)),
  )

  return (
    <div className="w-full sm:w-auto">
      <Button
        ref={(el) => {
          toggleRef.current = el
          if (buttonRef) buttonRef.current = el
        }}
        variant="outline"
        size="sm"
        icon={Plus}
        onClick={() => (open ? close() : openPanel())}
        aria-expanded={open}
        aria-controls={panelId}
      >
        Add Phone
      </Button>

      {open && (
        <div
          id={panelId}
          role="group"
          aria-label="Add a phone to this comparison"
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              e.stopPropagation()
              close()
            }
          }}
          className="mt-3 w-full sm:w-96 bg-white border border-slate-200 rounded-xl shadow-md p-4 animate-fade-in"
        >
          <div className="flex items-center justify-between gap-2 mb-2">
            <label htmlFor={searchId} className="text-sm font-semibold text-slate-800">
              Search the Catalog
            </label>
            <button
              type="button"
              onClick={close}
              aria-label="Close"
              className="w-10 h-10 flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage-600"
            >
              <X size={16} aria-hidden="true" />
            </button>
          </div>
          <div className="relative">
            <Search size={15} aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              ref={searchRef}
              id={searchId}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Name, brand or category"
              className="w-full text-sm border border-slate-300 rounded-lg pl-9 pr-3 py-2 min-h-10 focus:outline-none focus-visible:ring-2 focus-visible:ring-sage-600"
            />
          </div>

          <div className="mt-3 max-h-64 overflow-y-auto" aria-live="polite">
            {catalog.status === 'loading' && <p className="text-sm text-slate-600 py-2">Loading the catalog…</p>}
            {catalog.status === 'error' && (
              <div className="text-sm text-red-800 py-2">
                <p>{catalog.error}</p>
                <button type="button" onClick={load} className="mt-1 min-h-10 font-semibold underline rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage-600">
                  Try Again
                </button>
              </div>
            )}
            {catalog.status === 'ready' && choices.length === 0 && (
              <p className="text-sm text-slate-600 py-2">
                {q ? 'No other phone matches that search.' : 'Every catalog phone is already in this comparison.'}
              </p>
            )}
            {catalog.status === 'ready' && choices.length > 0 && (
              <ul className="divide-y divide-slate-100">
                {choices.map((g) => (
                  <li key={g.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setOpen(false)
                        setQuery('')
                        onAdd(g)
                      }}
                      aria-label={`Add ${g.name} to the comparison`}
                      className="w-full flex items-center justify-between gap-3 text-left px-2 py-2 min-h-10 rounded-md hover:bg-sage-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage-600"
                    >
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold text-slate-900 break-words">{g.name}</span>
                        <span className="block text-xs text-slate-600">
                          {g.brand} · {g.category}
                        </span>
                      </span>
                      <Plus size={16} aria-hidden="true" className="shrink-0 text-sage-700" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
