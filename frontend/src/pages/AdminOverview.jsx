// #206: admin-only overview. Read-only numbers from GET /admin/overview: catalog readiness,
// the last 14 days of questions and estimated AI spend, and user counts (no emails).
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { LayoutDashboard, RefreshCw } from 'lucide-react'
import { api } from '../api/client'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import ErrorState from '../components/ui/ErrorState'
import BackLink from '../components/ui/BackLink'
import Button from '../components/ui/Button'
import Alert from '../components/ui/Alert'
import { friendlyError } from '../utils/requestErrors'
import { formatUsd } from '../utils/formatUsd'

const number = new Intl.NumberFormat('en-US')

function formatDay(iso) {
  // Dates arrive as Manila calendar days (YYYY-MM-DD); format them without a timezone shift.
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC',
  })
}

function Stat({ label, value, hint }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4">
      <p className="text-sm text-gray-600">{label}</p>
      <p className="font-display text-2xl font-medium text-gray-900 mt-1">{value}</p>
      {hint && <p className="text-xs text-gray-500 mt-1">{hint}</p>}
    </div>
  )
}

const focusRing = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage-600'

// A panel that scrolls on its own once its content is taller than the cap, so a long gadget list or
// day list doesn't push the rest of the page down. Focusable, so keyboard users can scroll it too.
function ScrollPanel({ label, maxHeight = 'max-h-[26rem]', className = '', children }) {
  return (
    <div
      role="region"
      aria-label={label}
      tabIndex={0}
      className={`overflow-auto overscroll-contain ${maxHeight} ${focusRing} ${className}`}
    >
      {children}
    </div>
  )
}

// Header cells stay visible while the table body scrolls.
const stickyHead = 'sticky top-0 z-10 bg-white whitespace-nowrap text-left text-gray-600 shadow-[inset_0_-1px_0_var(--color-slate-200)]'

function Section({ id, title, children }) {
  return (
    <section aria-labelledby={id} className="mb-8">
      <h2 id={id} className="font-display text-lg font-medium text-gray-900 mb-3">
        {title}
      </h2>
      {children}
    </section>
  )
}

export default function AdminOverview() {
  useDocumentTitle('Admin Overview')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)

  function load() {
    setLoading(true)
    setLoadError(null)
    api.getAdminOverview().then(setData).catch((err) => setLoadError(friendlyError(err))).finally(() => setLoading(false))
  }

  useEffect(() => {
    // Standard fetch-on-mount pattern used throughout this app (see AdminCorrections);
    // the strict rule flags the loading-state toggle inside load().
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load()
  }, [])

  if (loading && !data) {
    return (
      <div className="space-y-3" role="status" aria-label="Loading overview">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-28 bg-gray-100 rounded-xl animate-pulse" />
        ))}
      </div>
    )
  }

  if (loadError && !data) {
    return (
      <div className="max-w-2xl mx-auto">
        <BackLink to="/">Back to Catalog</BackLink>
        <ErrorState title="Couldn't Load the Overview" message={loadError} onRetry={load} />
      </div>
    )
  }

  const { catalog, usage, users } = data
  const maxQuestions = Math.max(1, ...usage.days.map((d) => d.questions))

  return (
    <div>
      <BackLink to="/">Back to Catalog</BackLink>
      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div>
          <h1 className="font-display text-2xl font-medium text-gray-900 tracking-tight mb-1 flex items-center gap-2">
            <LayoutDashboard size={22} className="text-sage-700" /> Admin Overview
          </h1>
          <p className="text-sm text-gray-600">
            Catalog readiness, the last {usage.window_days} days of questions, and accounts. Read-only.
          </p>
        </div>
        <Button variant="secondary" size="sm" icon={RefreshCw} loading={loading} onClick={load}>
          {loading ? 'Refreshing…' : 'Refresh'}
        </Button>
      </div>

      <Section id="overview-catalog" title="Catalog">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          <Stat label="Gadgets" value={number.format(catalog.gadgets)} />
          <Stat
            label="Answerable by AI"
            value={`${catalog.gadgets_with_indexed_specs} of ${catalog.gadgets}`}
            hint="Gadgets with at least one indexed spec"
          />
          <Stat label="Spec chunks indexed" value={number.format(catalog.spec_chunks.indexed)} />
          <Stat
            label="Waiting for indexing"
            value={number.format(catalog.spec_chunks.not_indexed)}
            hint={catalog.spec_chunks.not_indexed > 0 ? 'Use Index All Pending on each gadget' : 'Nothing pending'}
          />
        </div>
        {catalog.gadgets_without_specs.length > 0 && (
          <Alert tone="warning" title={`Gadgets with no specs (${catalog.gadgets_without_specs.length})`}>
            <ScrollPanel label="Gadgets with no specs" maxHeight="max-h-28" className="rounded">
              {catalog.gadgets_without_specs.join(', ')}.
            </ScrollPanel>
            AI questions about them get “No Evidence Found”.
          </Alert>
        )}
        {catalog.per_gadget.length > 0 && (
          <ScrollPanel label="Spec chunks per gadget" className="mt-4 bg-white border border-slate-200 rounded-xl">
            <table className="w-full text-sm">
              <caption className="sr-only">Spec chunks per gadget</caption>
              <thead className={stickyHead}>
                <tr>
                  <th scope="col" className="px-4 py-2 font-medium">Gadget</th>
                  <th scope="col" className="px-4 py-2 font-medium text-right">Indexed</th>
                  <th scope="col" className="px-4 py-2 font-medium text-right">Pending</th>
                </tr>
              </thead>
              <tbody>
                {catalog.per_gadget.map((g) => (
                  <tr key={g.id} className="border-b border-slate-100 last:border-0">
                    <td className="px-4 py-2">
                      <Link to={`/gadgets/${g.id}`} className="text-sage-800 hover:underline">
                        {g.name}
                      </Link>
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums">{g.indexed}</td>
                    <td className={`px-4 py-2 text-right tabular-nums ${g.pending > 0 ? 'text-amber-700 font-medium' : ''}`}>
                      {g.pending}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ScrollPanel>
        )}
      </Section>

      <Section id="overview-usage" title={`Questions and AI spend (last ${usage.window_days} days, Manila time)`}>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          <Stat label="Answered questions" value={number.format(usage.totals.questions)} />
          <Stat label="Estimated spend" value={formatUsd(usage.totals.estimated_cost_usd)} hint="Logged answers only" />
          <Stat label="Input tokens" value={number.format(usage.totals.prompt_tokens)} />
          <Stat label="Output tokens" value={number.format(usage.totals.completion_tokens)} />
        </div>
        <Alert tone="info" title="About the spend figure">
          {usage.spend_note}
          {!usage.token_columns_present && ' Token columns are missing in this database, so only question counts are shown.'}
          {usage.rows_without_tokens > 0 && ` ${usage.rows_without_tokens} logged answer(s) have no token counts.`}
          {usage.truncated && ' Only the most recent 1,000 answers were counted.'}
        </Alert>
        <ScrollPanel label="Questions and estimated spend per day" className="mt-4 bg-white border border-slate-200 rounded-xl">
          <table className="w-full text-sm">
            <caption className="sr-only">Answered questions and estimated spend per day</caption>
            <thead className={stickyHead}>
              <tr>
                <th scope="col" className="px-4 py-2 font-medium">Day</th>
                <th scope="col" className="px-4 py-2 font-medium">Questions</th>
                <th scope="col" className="px-4 py-2 font-medium text-right">Input tokens</th>
                <th scope="col" className="px-4 py-2 font-medium text-right">Output tokens</th>
                <th scope="col" className="px-4 py-2 font-medium text-right">Est. spend</th>
              </tr>
            </thead>
            <tbody>
              {[...usage.days].reverse().map((d) => (
                <tr key={d.date} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-2 whitespace-nowrap">{formatDay(d.date)}</td>
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-2">
                      <span className="tabular-nums w-8">{d.questions}</span>
                      <span
                        aria-hidden="true"
                        className="inline-block h-2 rounded bg-sage-600"
                        style={{ width: `${(d.questions / maxQuestions) * 120}px` }}
                      />
                    </div>
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums">{number.format(d.prompt_tokens)}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{number.format(d.completion_tokens)}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{formatUsd(d.estimated_cost_usd)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </ScrollPanel>
      </Section>

      <Section id="overview-users" title="Users">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Stat
            label="Accounts"
            value={users.accounts == null ? 'Unavailable' : number.format(users.accounts)}
            hint={users.accounts == null ? 'The account count could not be read right now' : undefined}
          />
          <Stat
            label="Non-empty My Gadgets lists"
            value={users.my_gadgets_lists == null ? 'Unavailable' : number.format(users.my_gadgets_lists)}
          />
        </div>
      </Section>

      <p className="text-xs text-gray-500">Generated {new Date(data.generated_at).toLocaleString()}</p>
    </div>
  )
}
