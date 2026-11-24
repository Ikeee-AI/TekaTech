import { useEffect, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { Pencil, Calendar, ExternalLink } from 'lucide-react'
import { api } from '../api/client'
import { useAuth } from '../hooks/useAuth'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { GadgetDetailSkeleton } from '../components/Skeleton'
import SpecManager from '../components/SpecManager'
import DeleteGadgetButton from '../components/DeleteGadgetButton'
import GadgetChatPanel from '../components/GadgetChatPanel'
import BackLink from '../components/ui/BackLink'
import Button from '../components/ui/Button'
import ErrorState from '../components/ui/ErrorState'
import { timeAgo } from '../utils/timeAgo'
import { friendlyError } from '../utils/requestErrors'
import { countKeySpecs, extractKeySpecs, extractMoreSpecs, extractVariants, KEY_SPECS, MORE_SPECS } from '../utils/keySpecs'
import { specHighlights } from '../utils/specLayout'
import { isHttpUrl } from '../utils/gadgetValidation'
import PriceTag from '../components/PriceTag'
import KeySpecTiles from '../components/KeySpecTiles'
import MoreKeySpecs from '../components/MoreKeySpecs'
import ProductImage from '../components/ProductImage'
import { withoutDoubledBrand } from '../utils/gadgetName'
import VariantsList from '../components/VariantsList'
import BenchmarksSection from '../components/BenchmarksSection'
import WebDraftPanel from '../components/WebDraftPanel'

const SIX_MONTHS_MS = 1000 * 60 * 60 * 24 * 180

function formatRelease(date) {
  const d = new Date(date)
  if (Number.isNaN(d.getTime())) return date
  // release_date is a plain date read as midnight UTC; format in UTC so it doesn't shift a day.
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' })
}

export default function GadgetDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [state, setState] = useState({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)
  const [specs, setSpecs] = useState(null)
  // Bumped when the admin's web drafts save specs or benchmarks, so those panels reload.
  const [specsReload, setSpecsReload] = useState(0)
  const [benchmarksReload, setBenchmarksReload] = useState(0)
  const [now] = useState(() => Date.now())

  const gadget = state.gadget
  useDocumentTitle(gadget?.name)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- app-wide fetch convention (see CLAUDE.md)
    setState({ status: 'loading' })
    api
      .getGadget(id)
      .then((g) => setState({ status: 'ready', gadget: g }))
      // A malformed id (/gadgets/abc) is a 422 from the UUID check: it can never
      // load, so it's "not found" too, not a retryable error showing raw validation text.
      .catch((err) =>
        setState({ status: 'error', error: friendlyError(err), notFound: err.status === 404 || err.status === 422 }),
      )
  }, [id, attempt])

  if (state.status === 'loading') return <GadgetDetailSkeleton />

  if (state.status === 'error') {
    const notFound = state.notFound || /not found/i.test(state.error)
    return (
      <div className="max-w-3xl mx-auto">
        <BackLink to="/">Back to Catalog</BackLink>
        <ErrorState
          title={notFound ? 'Phone Not Found' : "Couldn't Load This Phone"}
          message={notFound ? 'It may have been deleted, or the link is wrong.' : state.error}
          onRetry={notFound ? undefined : () => setAttempt((n) => n + 1)}
          secondaryAction={
            <Button as={Link} to="/" variant={notFound ? 'primary' : 'secondary'}>
              Back to Catalog
            </Button>
          }
        />
      </div>
    )
  }

  const specList = specs ?? []
  const oldestVerified = specList.length
    ? specList.reduce((oldest, s) => (new Date(s.verified_at) < new Date(oldest) ? s.verified_at : oldest), specList[0].verified_at)
    : null
  const hasOutdated = specList.some((s) => now - new Date(s.verified_at).getTime() > SIX_MONTHS_MS)
  const keySpecs = extractKeySpecs(specList)
  const moreSpecs = extractMoreSpecs(specList)
  const coverage = countKeySpecs(keySpecs) + Object.values(moreSpecs).filter(Boolean).length
  const coverageTotal = KEY_SPECS.length + MORE_SPECS.length
  const highlights = specHighlights(specList)

  return (
    <div className="flex flex-col gap-4">
      <BackLink to="/">Back to Catalog</BackLink>

      {/* One top card (22 Nov 2026, owner's pick "A" in the current colours): the phone's
          details with the photo beside the name, like the catalog hero, highlights from its
          sources, and the key-spec panel. */}
      <article className="bg-white border border-slate-200 rounded-[28px] p-5 sm:p-6 grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_minmax(0,31rem)] gap-6">
        <div className="min-w-0 flex flex-col">
          <div className="flex items-start gap-4">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                {specs && (
                  <span className="font-mono text-[11px] font-semibold rounded-full px-2.5 py-1 bg-sage-700 text-white">
                    {specList.length} SOURCED SPEC{specList.length === 1 ? '' : 'S'}
                  </span>
                )}
                {oldestVerified && (
                  <span
                    className={`text-xs font-semibold rounded-full px-2.5 py-1 border ${
                      hasOutdated ? 'text-amber-800 bg-amber-50 border-amber-200' : 'text-slate-700 bg-slate-100 border-slate-200'
                    }`}
                  >
                    {hasOutdated ? 'Some Specs May Be Outdated · ' : ''}Added {timeAgo(oldestVerified)}
                  </span>
                )}
              </div>

              <h1 className="mt-3 text-4xl sm:text-5xl font-extrabold tracking-[-0.05em] leading-[0.95] text-slate-900 break-words">{withoutDoubledBrand(gadget.name)}</h1>
              <p className="mt-1.5 text-slate-600">{gadget.brand}</p>

              <dl className="mt-4 flex flex-wrap gap-x-8 gap-y-3">
                <div>
                  <dt className="text-xs font-semibold text-slate-500">Price</dt>
                  {gadget.price_php != null ? (
                    <dd className="mt-0.5 text-2xl font-bold tabular-nums text-slate-900">
                      <PriceTag gadget={gadget} />
                    </dd>
                  ) : (
                    <dd className="mt-1.5 text-base text-slate-500">Not listed</dd>
                  )}
                </div>
                <div>
                  <dt className="text-xs font-semibold text-slate-500">Released</dt>
                  <dd className="flex items-center gap-1.5 text-base font-medium text-slate-800 mt-1.5">
                    {gadget.release_date ? (
                      <>
                        <Calendar size={15} aria-hidden="true" className="text-slate-500" /> {formatRelease(gadget.release_date)}
                      </>
                    ) : (
                      <span className="text-slate-500">Not listed</span>
                    )}
                  </dd>
                </div>
              </dl>
            </div>
            {/* No frame: the photo sits beside the name, as in the catalog hero. */}
            <ProductImage
              src={gadget.image_url}
              alt={gadget.name}
              className="w-28 sm:w-44 lg:w-52 aspect-[4/3] shrink-0 !bg-transparent"
              glyphClassName="w-1/2 h-3/4"
              padding="p-0"
            />
          </div>

          {/* Highlights: details the tiles don't show, word for word from the source. */}
          {highlights.length > 0 && (
            <section aria-labelledby="highlights-title" className="mt-4">
              <h2 id="highlights-title" className="font-mono text-[11px] font-semibold uppercase tracking-wider text-sage-700">
                Highlights
              </h2>
              <dl className="mt-1.5">
                {highlights.map((h) => (
                  <div key={h.title} className="grid grid-cols-[7rem_minmax(0,1fr)] gap-3 py-1.5 border-t border-slate-200 first:border-t-0">
                    <dt className="text-sm font-medium text-slate-500">{h.title}</dt>
                    <dd className="text-sm text-slate-900 line-clamp-2" title={h.value}>
                      {h.value}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          )}

          {specs && (
            <div className="mt-4">
              <div className="flex items-baseline justify-between gap-3 text-xs">
                <span id="coverage-label" className="font-semibold text-slate-700">
                  {coverage} of {coverageTotal} key specs stated by the source
                </span>
                <span className="font-mono text-slate-500">{Math.round((coverage / coverageTotal) * 100)}%</span>
              </div>
              <div
                role="meter"
                aria-labelledby="coverage-label"
                aria-valuemin={0}
                aria-valuemax={coverageTotal}
                aria-valuenow={coverage}
                className="mt-1.5 h-1.5 rounded-full bg-slate-100 overflow-hidden"
              >
                <div className="h-full rounded-full bg-sage-700" style={{ width: `${(coverage / coverageTotal) * 100}%` }} />
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-2 mt-5">
            <Button as={Link} to={`/compare?ids=${id}`} variant="primary">
              Compare
            </Button>
            {isHttpUrl(gadget.store_url ?? '') && (
              <Button as="a" href={gadget.store_url} target="_blank" rel="noopener noreferrer" variant="outline" icon={ExternalLink}>
                Official store
                <span className="sr-only"> (opens in a new tab)</span>
              </Button>
            )}
            {/* Admin-curated catalog: PATCH /gadgets/{id} is admin-only. */}
            {user?.app_metadata?.is_admin && (
              <Button as={Link} to={`/gadgets/${id}/edit`} variant="outline" icon={Pencil}>
                Edit
              </Button>
            )}
            <DeleteGadgetButton gadget={gadget} onDeleted={() => navigate('/', { replace: true })} />
          </div>
        </div>

        {/* specs: null while loading, undefined if the specs couldn't load (SpecManager shows that error). */}
        {specs !== undefined && (
          <div className="flex flex-col gap-2.5 min-w-0">
            <KeySpecTiles keySpecs={keySpecs} size="sm" loading={specs === null} />
            <MoreKeySpecs moreSpecs={moreSpecs} loading={specs === null} bare />
            <VariantsList variants={extractVariants(specList)} bare />
          </div>
        )}
      </article>

      {/* Specs and chat side by side at one fixed height on wide screens: both scroll
          inside, so the page doesn't grow with the spec count or the conversation. */}
      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] gap-3.5 xl:h-[44rem]">
        <SpecManager gadgetId={id} onSpecsChange={setSpecs} reloadKey={specsReload} />

        <GadgetChatPanel
          gadgetId={id}
          gadgetName={withoutDoubledBrand(gadget.name)}
          category={gadget.category}
          suggestions={['What chip does it use?', 'Can it run Genshin Impact smoothly?', 'How long does the battery last?']}
        />
      </div>

      <BenchmarksSection gadgetId={id} isAdmin={Boolean(user?.app_metadata?.is_admin)} reloadKey={benchmarksReload} />

      {user?.app_metadata?.is_admin && (
        <WebDraftPanel
          gadgetId={id}
          onSpecsSaved={() => setSpecsReload((n) => n + 1)}
          onBenchmarksSaved={() => setBenchmarksReload((n) => n + 1)}
        />
      )}
    </div>
  )
}
