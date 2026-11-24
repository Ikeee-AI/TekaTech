import { useState } from 'react'
import { ExternalLink, Globe, Search } from 'lucide-react'
import toast from 'react-hot-toast'
import { api } from '../api/client'
import { friendlyError } from '../utils/requestErrors'
import { formatBenchmarkValue, groupSpecDrafts } from '../utils/benchmarks'
import Button from './ui/Button'

function host(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

/**
 * Admin only (24 Nov 2026): "Find on the web" drafts for this phone's specs or benchmarks.
 * Nothing is saved until the admin ticks the drafts they checked against the linked page and
 * presses Save. Specs are saved pending (index them in the Specs panel); benchmarks are added
 * straight to the Gaming and performance section. Each search is a paid web search with a daily cap.
 */
export default function WebDraftPanel({ gadgetId, onSpecsSaved, onBenchmarksSaved }) {
  const [kind, setKind] = useState(null) // what the current drafts are: 'specs' | 'benchmarks'
  const [drafts, setDrafts] = useState([])
  const [picked, setPicked] = useState(new Set())
  const [loading, setLoading] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  async function find(which) {
    setLoading(which)
    setError(null)
    try {
      const data = await api.draftFromWeb(gadgetId, which)
      const list = which === 'specs' ? data.specs : data.benchmarks
      setKind(which)
      setDrafts(list)
      setPicked(new Set())
      if (list.length === 0) setError('The web search found nothing it could link to a page. Try again later, or add them by hand.')
    } catch (err) {
      setError(friendlyError(err))
    } finally {
      setLoading(null)
    }
  }

  function toggle(i) {
    setPicked((prev) => {
      const next = new Set(prev)
      if (next.has(i)) next.delete(i)
      else next.add(i)
      return next
    })
  }

  async function save() {
    const chosen = drafts.filter((_, i) => picked.has(i))
    if (chosen.length === 0) return
    setSaving(true)
    setError(null)
    let saved = 0
    try {
      if (kind === 'specs') {
        for (const group of groupSpecDrafts(chosen)) {
          await api.ingestSpecs(gadgetId, group)
          saved += group.raw_text.split('\n').length
        }
        toast.success(`Saved ${saved} spec line${saved === 1 ? '' : 's'}. Index them in the Specs panel.`)
        onSpecsSaved?.()
      } else {
        for (const b of chosen) {
          await api.addBenchmark(gadgetId, b)
          saved += 1
        }
        toast.success(`Added ${saved} benchmark${saved === 1 ? '' : 's'}`)
        onBenchmarksSaved?.()
      }
      setDrafts((list) => list.filter((_, i) => !picked.has(i)))
      setPicked(new Set())
    } catch (err) {
      setError(`${saved > 0 ? `Saved ${saved}, then stopped: ` : ''}${friendlyError(err)}`)
      if (saved > 0) (kind === 'specs' ? onSpecsSaved : onBenchmarksSaved)?.()
    } finally {
      setSaving(false)
    }
  }

  return (
    <section aria-labelledby="web-drafts-title" className="rounded-3xl border border-dashed border-slate-300 bg-white p-5 sm:p-6">
      <h2 id="web-drafts-title" className="flex items-center gap-2 text-lg font-extrabold tracking-[-0.03em] text-slate-900">
        <Globe size={18} className="text-sage-700" aria-hidden="true" />
        Find on the web <span className="text-xs font-semibold text-slate-500">(admin)</span>
      </h2>
      <p className="mt-1 text-sm text-slate-600">
        Drafts with the page each came from. Open the link and check every value before you tick it; nothing is saved until you do.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button size="sm" icon={Search} onClick={() => find('specs')} loading={loading === 'specs'} disabled={Boolean(loading) || saving}>
          Find specs
        </Button>
        <Button size="sm" icon={Search} onClick={() => find('benchmarks')} loading={loading === 'benchmarks'} disabled={Boolean(loading) || saving}>
          Find benchmarks
        </Button>
      </div>
      {loading && <p className="mt-3 text-sm text-slate-500">Searching the web… this takes about 10–30 seconds.</p>}
      {error && (
        <p role="alert" className="mt-3 text-sm font-medium text-red-700">
          {error}
        </p>
      )}

      {drafts.length > 0 && (
        <div className="mt-4">
          <ul className="flex flex-col divide-y divide-slate-200 border-y border-slate-200">
            {drafts.map((d, i) => (
              <li key={`${i}-${d.source_url}`}>
                <label className="flex items-start gap-3 py-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={picked.has(i)}
                    onChange={() => toggle(i)}
                    className="mt-1 w-4 h-4 rounded border-slate-300 accent-sage-700"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm text-slate-900">
                      {kind === 'specs'
                        ? d.text
                        : `${d.test}${d.settings ? ` · ${d.settings}` : ''}: ${formatBenchmarkValue(d.value)} ${d.unit}`}
                    </span>
                    <a
                      href={d.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-slate-500 underline underline-offset-2 hover:text-sage-700"
                    >
                      {host(d.source_url)}
                      <ExternalLink size={11} aria-hidden="true" />
                      <span className="sr-only"> (opens in a new tab)</span>
                    </a>
                  </span>
                </label>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <Button variant="primary" size="sm" onClick={save} loading={saving} disabled={picked.size === 0}>
              Save {picked.size || ''} checked
            </Button>
            <button
              type="button"
              onClick={() => setPicked(picked.size === drafts.length ? new Set() : new Set(drafts.map((_, i) => i)))}
              className="text-sm font-semibold text-slate-700 underline underline-offset-2 hover:text-sage-700"
            >
              {picked.size === drafts.length ? 'Untick all' : 'Tick all'}
            </button>
          </div>
        </div>
      )}
    </section>
  )
}
