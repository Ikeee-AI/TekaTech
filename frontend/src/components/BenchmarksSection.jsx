import { useEffect, useId, useState } from 'react'
import { ExternalLink, Gamepad2, Gauge, Plus, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { api } from '../api/client'
import { friendlyError } from '../utils/requestErrors'
import { formatBenchmarkValue } from '../utils/benchmarks'
import Button from './ui/Button'
import ConfirmDialog from './ui/ConfirmDialog'

// A game result's bar is drawn against this frame rate (most phone games cap at 60 or 120).
const FPS_SCALE = 120
const EMPTY_FORM = { kind: 'game', test: '', settings: '', value: '', unit: 'fps', source_url: '' }

function sourceHost(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return 'source'
  }
}

function formatChecked(date) {
  const d = new Date(date)
  if (Number.isNaN(d.getTime())) return date
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
}

function BenchmarkRow({ row, isAdmin, onDelete }) {
  const isGame = row.kind === 'game' && row.unit.toLowerCase() === 'fps'
  const pct = isGame ? Math.min(100, (Number(row.value) / FPS_SCALE) * 100) : 0
  return (
    <li className="py-2.5 border-t border-slate-200 first:border-t-0">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-900">
            {row.test}
            {row.settings && <span className="font-normal text-slate-500"> · {row.settings}</span>}
          </p>
          <p className="text-xs text-slate-500">
            <a
              href={row.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 underline underline-offset-2 hover:text-sage-700 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage-600"
            >
              {sourceHost(row.source_url)}
              <ExternalLink size={11} aria-hidden="true" />
              <span className="sr-only"> (opens in a new tab)</span>
            </a>{' '}
            · checked {formatChecked(row.checked_at)}
          </p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <p className="text-lg font-extrabold tabular-nums text-slate-900">
            {formatBenchmarkValue(row.value)}
            <span className="text-sm font-semibold text-slate-600"> {row.unit}</span>
          </p>
          {isAdmin && (
            <button
              type="button"
              onClick={() => onDelete(row)}
              aria-label={`Delete ${row.test} benchmark`}
              className="inline-flex items-center justify-center size-8 rounded-full text-slate-500 hover:text-red-700 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage-600"
            >
              <Trash2 size={15} aria-hidden="true" />
            </button>
          )}
        </div>
      </div>
      {isGame && (
        <div className="mt-1.5 h-1.5 rounded-full bg-slate-100 overflow-hidden" aria-hidden="true">
          <div className="h-full rounded-full bg-sage-700" style={{ width: `${pct}%` }} />
        </div>
      )}
    </li>
  )
}

function AddBenchmarkForm({ gadgetId, onAdded }) {
  const uid = useId()
  const [form, setForm] = useState(EMPTY_FORM)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }))

  function changeKind(e) {
    const kind = e.target.value
    setForm((f) => ({ ...f, kind, unit: kind === 'game' ? 'fps' : f.unit === 'fps' ? 'points' : f.unit }))
  }

  async function submit(e) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const row = await api.addBenchmark(gadgetId, {
        ...form,
        settings: form.settings.trim() || null,
        value: Number(form.value),
      })
      toast.success('Benchmark added')
      setForm((f) => ({ ...EMPTY_FORM, kind: f.kind, unit: f.unit, source_url: f.source_url }))
      onAdded(row)
    } catch (err) {
      setError(friendlyError(err))
    } finally {
      setBusy(false)
    }
  }

  const input =
    'w-full bg-white text-slate-900 placeholder:text-slate-500 border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-sage-600 focus:ring-2 focus:ring-sage-200'
  return (
    <form onSubmit={submit} className="mt-3 grid grid-cols-2 sm:grid-cols-6 gap-2 items-end border-t border-slate-200 pt-3">
      <label className="col-span-1 text-xs font-semibold text-slate-700">
        Type
        <select value={form.kind} onChange={changeKind} className={`${input} mt-1`}>
          <option value="game">Game (fps)</option>
          <option value="score">Chip score</option>
        </select>
      </label>
      <label className="col-span-1 sm:col-span-2 text-xs font-semibold text-slate-700" htmlFor={`${uid}-test`}>
        {form.kind === 'game' ? 'Game' : 'Benchmark'}
        <input id={`${uid}-test`} required maxLength={80} value={form.test} onChange={set('test')}
          placeholder={form.kind === 'game' ? 'Genshin Impact' : 'Geekbench 6 multi-core'} className={`${input} mt-1`} />
      </label>
      <label className="col-span-2 sm:col-span-3 text-xs font-semibold text-slate-700" htmlFor={`${uid}-settings`}>
        Settings (optional)
        <input id={`${uid}-settings`} maxLength={80} value={form.settings} onChange={set('settings')}
          placeholder="High, 60 fps target" className={`${input} mt-1`} />
      </label>
      <label className="col-span-1 text-xs font-semibold text-slate-700" htmlFor={`${uid}-value`}>
        Result
        <input id={`${uid}-value`} required type="number" min="0" step="any" inputMode="decimal" value={form.value}
          onChange={set('value')} className={`${input} mt-1`} />
      </label>
      <label className="col-span-1 text-xs font-semibold text-slate-700" htmlFor={`${uid}-unit`}>
        Unit
        <input id={`${uid}-unit`} required maxLength={20} value={form.unit} onChange={set('unit')} className={`${input} mt-1`} />
      </label>
      <label className="col-span-2 sm:col-span-3 text-xs font-semibold text-slate-700" htmlFor={`${uid}-source`}>
        Source link
        <input id={`${uid}-source`} required type="url" maxLength={2000} value={form.source_url} onChange={set('source_url')}
          placeholder="https://… (review or benchmark page)" className={`${input} mt-1`} />
      </label>
      <div className="col-span-2 sm:col-span-1">
        <Button type="submit" variant="primary" size="sm" icon={Plus} loading={busy} className="w-full justify-center">
          Add
        </Button>
      </div>
      {error && (
        <p role="alert" className="col-span-2 sm:col-span-6 text-sm font-medium text-red-700">
          {error}
        </p>
      )}
    </form>
  )
}

/**
 * Published game and chip benchmarks for one phone (24 Nov 2026). Every row links to where the
 * number was published; TekaTech does not run benchmarks itself. Admins add and delete rows here.
 * The AI chat cites these rows for performance questions (backend routers/query.py).
 */
export default function BenchmarksSection({ gadgetId, isAdmin, reloadKey = 0 }) {
  const [rows, setRows] = useState(null)
  const [error, setError] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [busy, setBusy] = useState(false)
  const [deleteError, setDeleteError] = useState(null)

  useEffect(() => {
    let live = true
    api
      .getBenchmarks(gadgetId)
      .then((data) => live && setRows(data))
      .catch((err) => live && setError(friendlyError(err)))
    return () => {
      live = false
    }
  }, [gadgetId, reloadKey])

  async function confirmDelete() {
    setBusy(true)
    setDeleteError(null)
    try {
      await api.deleteBenchmark(gadgetId, deleting.id)
      setRows((list) => list.filter((r) => r.id !== deleting.id))
      toast.success('Benchmark deleted')
      setDeleting(null)
    } catch (err) {
      setDeleteError(friendlyError(err))
    } finally {
      setBusy(false)
    }
  }

  // Visitors see nothing until there is something to show; admins always see the section to add rows.
  if (!isAdmin && (error || !rows || rows.length === 0)) return null

  const games = (rows ?? []).filter((r) => r.kind === 'game')
  const scores = (rows ?? []).filter((r) => r.kind === 'score')

  return (
    <section aria-labelledby="benchmarks-title" className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6">
      <h2 id="benchmarks-title" className="text-xl font-extrabold tracking-[-0.03em] text-slate-900">
        Gaming and performance
      </h2>
      <p className="mt-1 text-sm text-slate-600">
        Published results with their sources. TekaTech doesn&apos;t run these tests itself.
      </p>
      {error && <p className="mt-3 text-sm text-red-700">{error}</p>}
      {rows === null && !error && <p className="mt-3 text-sm text-slate-500">Loading benchmarks…</p>}
      {rows && rows.length === 0 && <p className="mt-3 text-sm text-slate-500">No benchmarks yet. Add the first one below.</p>}

      <div className="mt-3 grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-4">
        {games.length > 0 && (
          <div>
            <h3 className="flex items-center gap-1.5 font-mono text-[11px] font-semibold uppercase tracking-wider text-sage-700">
              <Gamepad2 size={14} aria-hidden="true" /> Games (average fps)
            </h3>
            <ul className="mt-1">
              {games.map((r) => (
                <BenchmarkRow key={r.id} row={r} isAdmin={isAdmin} onDelete={setDeleting} />
              ))}
            </ul>
          </div>
        )}
        {scores.length > 0 && (
          <div>
            <h3 className="flex items-center gap-1.5 font-mono text-[11px] font-semibold uppercase tracking-wider text-sage-700">
              <Gauge size={14} aria-hidden="true" /> Chip scores
            </h3>
            <ul className="mt-1">
              {scores.map((r) => (
                <BenchmarkRow key={r.id} row={r} isAdmin={isAdmin} onDelete={setDeleting} />
              ))}
            </ul>
          </div>
        )}
      </div>

      {isAdmin && rows && <AddBenchmarkForm gadgetId={gadgetId} onAdded={(row) => setRows((list) => [...list, row])} />}

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Delete this benchmark?"
        description={deleting ? `${deleting.test}: ${formatBenchmarkValue(deleting.value)} ${deleting.unit}` : ''}
        busy={busy}
        error={deleteError}
        onConfirm={confirmDelete}
        onCancel={() => {
          setDeleting(null)
          setDeleteError(null)
        }}
      />
    </section>
  )
}
