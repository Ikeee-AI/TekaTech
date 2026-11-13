import { useEffect, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { Pencil, Calendar } from 'lucide-react'
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
import { formatPeso } from '../utils/formatPeso'
import { extractKeySpecs, extractVariants } from '../utils/keySpecs'
import KeySpecTiles from '../components/KeySpecTiles'
import ProductImage from '../components/ProductImage'
import { withoutDoubledBrand } from '../utils/gadgetName'
import VariantsList from '../components/VariantsList'

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

  const price = formatPeso(gadget.price_php)

  return (
    <div className="flex flex-col gap-4">
      <BackLink to="/">Back to Catalog</BackLink>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] gap-3.5">
        <article className="bg-white border border-slate-200 rounded-[28px] p-5 sm:p-6 flex flex-col sm:flex-row gap-5 sm:gap-6">
          <ProductImage
            src={gadget.image_url}
            alt={gadget.name}
            className="w-32 sm:w-40 self-center sm:self-start aspect-[3/4] shrink-0"
            glyphClassName="w-1/2 h-3/4"
          />

          <div className="min-w-0 flex flex-col">
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
                {price ? (
                  <dd className="mt-0.5 text-2xl font-bold tabular-nums text-slate-900">{price}</dd>
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

            <div className="flex flex-wrap gap-2 mt-auto pt-5">
              <Button as={Link} to={`/compare?ids=${id}`} variant="primary">
                Compare
              </Button>
              {/* Admin-curated catalog: PATCH /gadgets/{id} is admin-only. */}
              {user?.app_metadata?.is_admin && (
                <Button as={Link} to={`/gadgets/${id}/edit`} variant="outline" icon={Pencil}>
                  Edit
                </Button>
              )}
              <DeleteGadgetButton gadget={gadget} onDeleted={() => navigate('/', { replace: true })} />
            </div>
          </div>
        </article>

        {/* specs: null while loading, undefined if the specs couldn't load (SpecManager shows that error). */}
        {specs !== undefined && (
          <div className="flex flex-col gap-3.5 min-w-0">
            <KeySpecTiles keySpecs={extractKeySpecs(specList)} loading={specs === null} />
            <VariantsList variants={extractVariants(specList)} />
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] gap-3.5 items-start">
        <GadgetChatPanel
          gadgetId={id}
          gadgetName={withoutDoubledBrand(gadget.name)}
          category={gadget.category}
          suggestions={['What chip does it use?', 'How long does the battery last?', 'Is it water resistant?']}
        />

        <SpecManager gadgetId={id} onSpecsChange={setSpecs} />
      </div>
    </div>
  )
}
