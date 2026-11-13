import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronDown, FileText, Plus, ExternalLink, Calendar, Flag, CheckCircle2, Clock, Sparkles, LogIn, RefreshCw, Send, Save, Loader2, AlertCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { api } from '../api/client'
import { useAuth } from '../hooks/useAuth'
import { timeAgo } from '../utils/timeAgo'
import Button from './ui/Button'
import DeleteSpecButton from './DeleteSpecButton'
import Alert from './ui/Alert'
import { TextField, TextAreaField } from './ui/FormField'
import { friendlyError } from '../utils/requestErrors'
import { notifyCorrectionsChanged } from '../utils/correctionNotices'
import { groupSpecsBySource, specBlocks } from '../utils/specLayout'

const MAX_SPEC_CHARS = 20_000 // mirrors MAX_RAW_TEXT_LENGTH in backend/routers/specs.py
const SIX_MONTHS_MS = 1000 * 60 * 60 * 24 * 180

// The button that opens a form is hidden while the form is open; when the form closes
// (cancel, save or submit) focus goes back to that button instead of being lost.
function useFocusOnClose(open) {
  const ref = useRef(null)
  const wasOpen = useRef(open)
  useEffect(() => {
    if (wasOpen.current && !open) ref.current?.focus()
    wasOpen.current = open
  }, [open])
  return ref
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

function isHttpUrl(value) {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

function validateSpecForm({ rawText, sourceUrl }) {
  const errors = {}
  if (!rawText.trim()) errors['raw-text'] = 'Paste at least one spec line.'
  else if (rawText.length > MAX_SPEC_CHARS) errors['raw-text'] = `Shorten this to ${MAX_SPEC_CHARS.toLocaleString()} characters or fewer.`
  if (sourceUrl.trim() && !isHttpUrl(sourceUrl.trim())) errors['source-url'] = 'Enter a full link starting with http:// or https://.'
  return errors
}

function AddSpecForm({ gadgetId, onSaved, onCancel }) {
  const [rawText, setRawText] = useState('')
  const [sourceUrl, setSourceUrl] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [serverError, setServerError] = useState(null)

  const errors = submitted ? validateSpecForm({ rawText, sourceUrl }) : {}

  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitted(true)
    const found = validateSpecForm({ rawText, sourceUrl })
    if (Object.keys(found).length > 0) {
      document.getElementById(Object.keys(found)[0])?.focus()
      return
    }
    setSubmitting(true)
    setServerError(null)
    try {
      const result = await api.ingestSpecs(gadgetId, { raw_text: rawText, source_url: sourceUrl.trim() || undefined })
      toast.success(`${result.chunks_created} spec chunk${result.chunks_created === 1 ? '' : 's'} saved — AI indexing pending`)
      onSaved()
    } catch (err) {
      setServerError(friendlyError(err))
      setSubmitting(false)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      aria-labelledby="add-specs-title"
      className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 mb-4 space-y-4 animate-fade-in"
    >
      <h3 id="add-specs-title" className="text-base font-bold text-slate-900">
        Add Specs
      </h3>
      <TextAreaField
        id="raw-text"
        label="Raw Spec Text"
        required
        autoFocus
        rows={7}
        value={rawText}
        onChange={(v) => {
          setRawText(v)
          setServerError(null)
        }}
        error={errors['raw-text']}
        hint={`Separate facts with blank lines; short blocks are grouped together into one searchable snippet. ${rawText.length.toLocaleString()} / ${MAX_SPEC_CHARS.toLocaleString()} characters.`}
        placeholder={'Display: 6.2-inch AMOLED, 120Hz\n\nBattery: 4000mAh, 25W fast charging'}
      />
      <TextField
        id="source-url"
        label="Source URL"
        optional
        type="url"
        inputMode="url"
        value={sourceUrl}
        onChange={(v) => {
          setSourceUrl(v)
          setServerError(null)
        }}
        error={errors['source-url']}
        hint="Link to the official spec sheet, so others can check it."
        placeholder="https://…"
      />
      {serverError && (
        <Alert tone="error" title="Specs Not Saved">
          {serverError}
        </Alert>
      )}
      <div className="flex flex-col-reverse sm:flex-row gap-2">
        <Button variant="secondary" onClick={onCancel} disabled={submitting}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" icon={Save} loading={submitting} className="sm:flex-1">
          {submitting ? 'Saving…' : 'Save Specs'}
        </Button>
      </div>
    </form>
  )
}

function CorrectionForm({ spec, onDone }) {
  const [text, setText] = useState(spec.content)
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [serverError, setServerError] = useState(null)
  const id = `correction-${spec.id}`

  let error
  if (submitted && !text.trim()) error = 'Write the corrected spec text.'
  else if (submitted && text.trim() === spec.content.trim()) error = 'Change something before submitting — this matches the current text.'

  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitted(true)
    if (!text.trim() || text.trim() === spec.content.trim()) {
      document.getElementById(id)?.focus()
      return
    }
    setSubmitting(true)
    setServerError(null)
    try {
      await api.submitCorrection(spec.id, { suggested_content: text })
      toast.success(
        <span>
          Suggestion sent — you&apos;ll see the decision in{' '}
          <Link to="/my-suggestions" className="font-semibold text-sage-700 underline">
            My Suggestions
          </Link>
          .
        </span>,
        { duration: 6000 },
      )
      notifyCorrectionsChanged()
      onDone()
    } catch (err) {
      setServerError(friendlyError(err))
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="mt-4 pt-4 border-t border-slate-200 space-y-3 animate-fade-in">
      <TextAreaField
        id={id}
        label="Suggested Correction"
        required
        autoFocus
        rows={3}
        value={text}
        onChange={setText}
        error={error}
        hint="An admin reviews every correction before it replaces the current text."
      />
      {serverError && <Alert tone="error">{serverError}</Alert>}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" variant="primary" size="sm" icon={Send} loading={submitting}>
          {submitting ? 'Submitting…' : 'Submit for Review'}
        </Button>
        <Button variant="secondary" size="sm" onClick={onDone} disabled={submitting}>
          Cancel
        </Button>
      </div>
    </form>
  )
}

// Plain sentences the index endpoint sends (backend/routers/specs.py). Anything else
// gets fixed copy so raw errors never reach the screen.
const SAFE_INDEX_STATUSES = [404, 409, 422, 503]

function indexFailureMessage(err) {
  if (SAFE_INDEX_STATUSES.includes(err?.status) && typeof err.message === 'string' && err.message.length < 200) {
    return err.message
  }
  if (err?.status === 401) return 'Log in again, then retry.'
  if (err?.status === 429) return 'Too many indexing requests. Wait a little, then retry.'
  if (err instanceof TypeError) return 'Could not reach TekaTech. Check your connection, then retry.'
  return 'Indexing did not finish. Your spec text is saved; please retry.'
}

/** Copy of `obj` with `key` set to `value`, or removed when `value` is undefined. */
function withEntry(obj, key, value) {
  const next = { ...obj }
  if (value === undefined) delete next[key]
  else next[key] = value
  return next
}

const INDEX_STATES = {
  indexed: { label: 'Ready for AI', icon: CheckCircle2, className: 'text-emerald-800 bg-emerald-50 border-emerald-200' },
  pending: { label: 'Pending AI Indexing', icon: Clock, className: 'text-amber-800 bg-amber-50 border-amber-200' },
  indexing: { label: 'Indexing…', icon: Loader2, className: 'text-sky-800 bg-sky-50 border-sky-200', spin: true },
  failed: { label: 'Indexing Failed', icon: AlertCircle, className: 'text-red-800 bg-red-50 border-red-200' },
}

function IndexBadge({ state }) {
  const { label, icon: Icon, className, spin } = INDEX_STATES[state]
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold rounded-full px-2 py-0.5 border ${className}`}>
      <Icon size={13} aria-hidden="true" className={spin ? 'animate-spin' : ''} />
      {label}
    </span>
  )
}

/** How much of this gadget's evidence the AI can actually use right now. */
function AiReadiness({ specs }) {
  const ready = specs.filter((s) => s.indexing_status === 'indexed').length
  const total = specs.length
  if (ready === total) {
    return (
      <p className="flex items-center gap-1.5 text-sm font-medium text-emerald-800 mb-3">
        <CheckCircle2 size={16} aria-hidden="true" /> All {total} spec{total === 1 ? ' is' : 's are'} ready for AI answers.
      </p>
    )
  }
  if (ready === 0) {
    return (
      <Alert tone="warning" title="The AI Has No Evidence for This Gadget Yet" className="mb-3">
        None of its specs are indexed, so AI answers can&apos;t cite anything about it. Index the specs below to fix this.
      </Alert>
    )
  }
  return (
    <Alert tone="info" title={`${ready} of ${total} Specs Ready for AI`} className="mb-3">
      AI answers can only use the ready specs. Index the pending ones to give it the full picture.
    </Alert>
  )
}

function sourceLabel(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

function SpecContent({ content }) {
  return (
    <div className="space-y-2">
      {specBlocks(content).map((block, i) =>
        block.type === 'facts' ? (
          <dl key={i} className="grid grid-cols-1 sm:grid-cols-[minmax(7rem,auto)_1fr] gap-x-4 gap-y-1 text-[15px]">
            {block.items.map((item, j) => (
              <div key={j} className="contents">
                <dt className="font-medium text-slate-500 sm:pt-px">{item.label}</dt>
                <dd className="text-slate-900 break-words mb-1 sm:mb-0">{item.value}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <p key={i} className="text-[15px] text-slate-800 break-words">
            {block.text}
          </p>
        ),
      )}
    </div>
  )
}

/** One saved chunk inside its source card: the text, plus row-level status and actions. */
function SpecRow({ spec, user, isAdmin, gadgetId, indexingId, indexError, onIndex, onDeleted }) {
  const [correcting, setCorrecting] = useState(false)
  const suggestButtonRef = useFocusOnClose(correcting)
  const indexed = spec.indexing_status === 'indexed'
  const isIndexing = indexingId === spec.id
  const indexState = indexed ? 'indexed' : isIndexing ? 'indexing' : indexError ? 'failed' : 'pending'

  return (
    <li className="px-4 sm:px-5 py-3.5" aria-label={`Spec #${spec.chunk_index}`}>
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <SpecContent content={spec.content} />
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {user && !correcting && (
            <Button
              ref={suggestButtonRef}
              variant="ghost"
              size="sm"
              icon={Flag}
              onClick={() => setCorrecting(true)}
              aria-label={`Suggest Correction for spec #${spec.chunk_index}`}
              title="Suggest Correction"
              className="!px-2.5"
            />
          )}
          <DeleteSpecButton gadgetId={gadgetId} spec={spec} onDeleted={onDeleted} />
        </div>
      </div>

      {indexState !== 'indexed' && (
        <div className="mt-2.5 flex flex-wrap items-center gap-2">
          <IndexBadge state={indexState} />
          {indexState === 'pending' && (
            <span className="text-sm text-amber-900">
              The AI can&apos;t use this part yet.{!isAdmin && ' An admin needs to index it.'}
            </span>
          )}
          {isAdmin && (
            <Button
              variant="outline"
              size="sm"
              icon={Sparkles}
              loading={isIndexing}
              disabled={indexingId !== null}
              onClick={() => onIndex(gadgetId, spec.id)}
            >
              {isIndexing ? 'Indexing…' : indexError ? 'Retry Indexing' : 'Index for AI'}
            </Button>
          )}
        </div>
      )}
      {indexState === 'failed' && (
        <Alert tone="error" title="Indexing Failed — Your Spec Is Saved" className="mt-2.5">
          {indexError}
        </Alert>
      )}

      {correcting && <CorrectionForm spec={spec} onDone={() => setCorrecting(false)} />}
    </li>
  )
}

/** One card per source: link and date once in the header, its chunks as rows below. */
function SpecSourceGroup({ group, defaultOpen, user, isAdmin, gadgetId, indexingId, indexErrors, onIndex, onDeleted }) {
  const [now] = useState(() => Date.now())
  const [expanded, setExpanded] = useState(defaultOpen)
  const rowsId = useId()
  const { sourceUrl, specs } = group
  // A part that is indexing or failed to index keeps its card open, so the progress or the
  // error is never hidden behind a closed card.
  const mustShow = specs.some((s) => indexingId === s.id || indexErrors[s.id])
  const open = expanded || mustShow
  const ready = specs.filter((s) => s.indexing_status === 'indexed').length
  // The oldest verification in the group decides "May Be Outdated".
  const oldest = specs.reduce((a, s) => (new Date(s.verified_at) < new Date(a) ? s.verified_at : a), specs[0].verified_at)
  const outdated = now - new Date(oldest).getTime() > SIX_MONTHS_MS

  return (
    <li className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <div
        className={`flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 sm:px-5 py-3 bg-slate-50 ${open ? 'border-b border-slate-200' : ''}`}
      >
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 min-w-0">
          {/* Only http(s) becomes a link: a stored javascript:/data: URL must never be clickable. */}
          {isHttpUrl(sourceUrl) ? (
            <a
              href={sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 min-h-10 sm:min-h-0 text-sm font-semibold text-sage-700 hover:underline rounded break-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage-600"
            >
              <ExternalLink size={14} aria-hidden="true" className="shrink-0" /> {sourceLabel(sourceUrl)}
              <span className="sr-only">(source, opens in a new tab)</span>
            </a>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600">
              <FileText size={14} aria-hidden="true" /> No source link
            </span>
          )}
          <span className="inline-flex items-center gap-1 text-sm text-slate-600" title={formatDate(oldest)}>
            <Calendar size={13} aria-hidden="true" /> Verified {timeAgo(oldest)}
          </span>
          {outdated && <span className="text-sm text-amber-800 font-semibold">May Be Outdated</span>}
        </div>
        <div className="flex items-center gap-2">
          {ready === specs.length ? (
            <IndexBadge state="indexed" />
          ) : (
            <span className="text-xs font-semibold text-amber-800">
              {ready} of {specs.length} ready for AI
            </span>
          )}
          <button
            type="button"
            onClick={() => setExpanded(!open)}
            disabled={mustShow}
            aria-expanded={open}
            aria-controls={rowsId}
            aria-label={`${open ? 'Hide' : 'Show'} ${specs.length} spec part${specs.length === 1 ? '' : 's'} from ${sourceUrl ? sourceLabel(sourceUrl) : 'no source link'}`}
            className="inline-flex items-center gap-1 min-h-10 sm:min-h-8 px-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-200/70 disabled:opacity-60 disabled:cursor-not-allowed transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage-600"
          >
            {specs.length} part{specs.length === 1 ? '' : 's'}
            <ChevronDown size={16} aria-hidden="true" className={`transition-transform ${open ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>
      <ul id={rowsId} hidden={!open} className="divide-y divide-slate-100">
        {specs.map((spec) => (
          <SpecRow
            key={spec.id}
            spec={spec}
            user={user}
            isAdmin={isAdmin}
            gadgetId={gadgetId}
            indexingId={indexingId}
            indexError={indexErrors[spec.id]}
            onIndex={onIndex}
            onDeleted={onDeleted}
          />
        ))}
      </ul>
    </li>
  )
}

export default function SpecManager({ gadgetId, onSpecsChange }) {
  const { user } = useAuth()
  const isAdmin = Boolean(user?.app_metadata?.is_admin)
  const [state, setState] = useState({ status: 'loading', specs: [] })
  const [showForm, setShowForm] = useState(false)
  const addButtonRef = useFocusOnClose(showForm)
  const [indexingId, setIndexingId] = useState(null)
  const [indexErrors, setIndexErrors] = useState({})
  const [bulk, setBulk] = useState(null) // Index All Pending progress: { done, total } while running

  // `background` refreshes without the loading skeleton, so the list (and any
  // open correction form) stays on screen; a failed background refresh keeps it.
  const loadSpecs = useCallback(({ background = false } = {}) => {
    if (!background) setState((s) => ({ ...s, status: 'loading' }))
    api
      .getSpecs(gadgetId)
      .then((data) => {
        setState({ status: 'ready', specs: data })
        onSpecsChange?.(data)
      })
      .catch((err) => {
        if (!background) {
          setState({ status: 'error', specs: [], error: friendlyError(err) })
          // undefined = couldn't load (not "no specs"), so the page doesn't claim nothing is stated.
          onSpecsChange?.(undefined)
        }
      })
  }, [gadgetId, onSpecsChange])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- app-wide fetch convention (see CLAUDE.md)
    loadSpecs()
  }, [loadSpecs])

  // Indexes one chunk. Returns the error (or null), so a bulk run can stop on a rate limit.
  function indexOne(gid, specId) {
    setIndexingId(specId)
    setIndexErrors((prev) => withEntry(prev, specId, undefined))
    return api
      .indexSpec(gid, specId)
      .then(() => {
        // Show the new status straight away; the caller confirms it from the server quietly.
        setState((s) => ({
          ...s,
          specs: s.specs.map((sp) => (sp.id === specId ? { ...sp, indexing_status: 'indexed' } : sp)),
        }))
        return null
      })
      .catch((err) => {
        // Kept on the card (not just a toast) so the failure stays visible until retried.
        setIndexErrors((prev) => withEntry(prev, specId, indexFailureMessage(err)))
        return err
      })
      .finally(() => setIndexingId(null))
  }

  async function handleIndex(gid, specId) {
    const err = await indexOne(gid, specId)
    if (!err) toast.success('Spec ready for AI questions')
    loadSpecs({ background: true })
  }

  // Admin convenience: index every pending chunk in turn (one request at a time, the same
  // endpoint as the per-card button). Stops at a rate limit (20/hour) or a session problem
  // instead of hammering the API; other failures stay on their card and the run continues.
  async function handleIndexAll() {
    const pending = state.specs.filter((sp) => sp.indexing_status !== 'indexed').map((sp) => sp.id)
    if (pending.length === 0) return
    let ok = 0
    let failed = 0
    let stopped = null
    for (let i = 0; i < pending.length; i += 1) {
      setBulk({ done: i, total: pending.length })
      const err = await indexOne(gadgetId, pending[i])
      if (!err) ok += 1
      else {
        failed += 1
        if (err.status === 429 || err.status === 401) {
          stopped = err.status
          break
        }
      }
    }
    setBulk(null)
    loadSpecs({ background: true })
    const left = pending.length - ok
    if (stopped === 429) toast.error(`Indexed ${ok}. Stopped at the hourly indexing limit; ${left} still pending.`)
    else if (stopped === 401) toast.error(`Indexed ${ok}. Log in again to index the remaining ${left}.`)
    else if (failed > 0) toast.error(`Indexed ${ok} of ${pending.length}. ${failed} failed; see the cards below.`)
    else toast.success(`All ${ok} spec${ok === 1 ? '' : 's'} ready for AI questions`)
  }

  const { status, specs } = state

  return (
    <section aria-labelledby="specs-title" className="min-w-0">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
        <h2 id="specs-title" className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <FileText size={20} className="text-sage-700" aria-hidden="true" /> Specifications
          {status === 'ready' && <span className="text-sm font-medium text-slate-500">({specs.length})</span>}
        </h2>
        {/* Admin-curated catalog (scope change, 3 Nov 2026): only admins add specs.
            Everyone else contributes by suggesting corrections, which needs an account. */}
        {isAdmin ? (
          !showForm && (
            <Button ref={addButtonRef} variant="outline" icon={Plus} onClick={() => setShowForm(true)}>
              Add Specs
            </Button>
          )
        ) : (
          !user && (
            <Button as={Link} to="/login" variant="outline" icon={LogIn}>
              Log In to Suggest Corrections
            </Button>
          )
        )}
      </div>
      {isAdmin ? (
        <p className="text-sm text-slate-600 mb-4">
          Specs are saved immediately. Use Index for AI when credit is available; pending specs remain readable here.
        </p>
      ) : (
        <p className="text-sm text-slate-600 mb-4">
          Specs are added by the TekaTech team. Spot a mistake? Use Suggest Correction on the spec and an admin will review it.
        </p>
      )}

      {showForm && (
        <AddSpecForm
          gadgetId={gadgetId}
          onCancel={() => setShowForm(false)}
          onSaved={() => {
            setShowForm(false)
            loadSpecs()
          }}
        />
      )}

      {status === 'loading' && (
        <div className="space-y-3" role="status" aria-label="Loading specs">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-slate-100 rounded-xl animate-pulse" />
          ))}
        </div>
      )}

      {status === 'error' && (
        <Alert
          tone="error"
          title="Couldn't Load Specs"
          action={
            <Button variant="secondary" size="sm" icon={RefreshCw} onClick={() => loadSpecs()}>
              Try Again
            </Button>
          }
        >
          {state.error}
        </Alert>
      )}

      {status === 'ready' && specs.length === 0 && (
        <div className="text-center bg-white border border-slate-300 border-dashed rounded-xl px-6 py-10">
          <FileText size={24} className="mx-auto text-slate-400" aria-hidden="true" />
          <p className="font-semibold text-slate-800 mt-2">No Specs Yet</p>
          <p className="text-sm text-slate-600 mt-1">Add a spec sheet so the AI can answer questions about this gadget.</p>
        </div>
      )}

      {status === 'ready' && specs.length > 0 && <AiReadiness specs={specs} />}

      {isAdmin && status === 'ready' && specs.some((sp) => sp.indexing_status !== 'indexed') && (
        <div className="flex flex-wrap items-center gap-3 mb-3">
          <Button
            variant="primary"
            size="sm"
            icon={Sparkles}
            loading={bulk !== null}
            disabled={indexingId !== null}
            onClick={handleIndexAll}
          >
            {bulk
              ? `Indexing ${bulk.done + 1} of ${bulk.total}…`
              : `Index All Pending (${specs.filter((sp) => sp.indexing_status !== 'indexed').length})`}
          </Button>
          <span className="text-xs text-slate-600">One at a time; indexing is limited to 20 per hour.</span>
        </div>
      )}

      {status === 'ready' && specs.length > 0 && (
        <ul className="space-y-4">
          {groupSpecsBySource(specs).map((group, i) => (
            <SpecSourceGroup
              key={group.key || 'no-source'}
              defaultOpen={i === 0}
              group={group}
              user={user}
              isAdmin={isAdmin}
              gadgetId={gadgetId}
              indexingId={indexingId}
              indexErrors={indexErrors}
              onIndex={handleIndex}
              onDeleted={loadSpecs}
            />
          ))}
        </ul>
      )}
    </section>
  )
}
