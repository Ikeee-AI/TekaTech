import { useEffect, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { Pencil, Calendar, ImageOff, LogIn } from 'lucide-react'
import { api } from '../api/client'
import { useAuth } from '../hooks/useAuth'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { GadgetDetailSkeleton } from '../components/Skeleton'
import SpecManager from '../components/SpecManager'
import DeleteGadgetButton from '../components/DeleteGadgetButton'
import AIComparisonPanel from '../components/AIComparisonPanel'
import BackLink from '../components/ui/BackLink'
import Button from '../components/ui/Button'
import ErrorState from '../components/ui/ErrorState'
import { timeAgo } from '../utils/timeAgo'
import { friendlyError } from '../utils/requestErrors'

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
  const [imgError, setImgError] = useState(false)
  const [specs, setSpecs] = useState([])
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
          title={notFound ? 'Gadget Not Found' : "Couldn't Load This Gadget"}
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

  const showImage = gadget.image_url && !imgError
  const oldestVerified = specs.length
    ? specs.reduce((oldest, s) => (new Date(s.verified_at) < new Date(oldest) ? s.verified_at : oldest), specs[0].verified_at)
    : null
  const hasOutdated = specs.some((s) => now - new Date(s.verified_at).getTime() > SIX_MONTHS_MS)

  return (
    <div className="max-w-3xl mx-auto">
      <BackLink to="/">Back to Catalog</BackLink>

      <article className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 shadow-xs grid grid-cols-1 sm:grid-cols-[minmax(0,15rem)_minmax(0,1fr)] gap-6 sm:gap-8">
        <div className="aspect-square sm:aspect-auto sm:h-60 w-full bg-slate-100 rounded-lg overflow-hidden flex items-center justify-center">
          {showImage ? (
            <img src={gadget.image_url} alt={gadget.name} className="h-full w-full object-cover" onError={() => setImgError(true)} />
          ) : (
            <span className="flex flex-col items-center gap-2 text-slate-500 text-sm">
              <ImageOff size={28} aria-hidden="true" />
              No Photo
            </span>
          )}
        </div>

        <div className="min-w-0 flex flex-col">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-sage-800 bg-sage-50 border border-sage-200 rounded-full px-2.5 py-1 uppercase tracking-wide">
              {gadget.category}
            </span>
            {oldestVerified && (
              <span
                className={`text-xs font-semibold rounded-full px-2.5 py-1 border ${
                  hasOutdated ? 'text-amber-800 bg-amber-50 border-amber-200' : 'text-slate-700 bg-slate-50 border-slate-200'
                }`}
              >
                {hasOutdated ? 'Some Specs May Be Outdated · ' : ''}Verified {timeAgo(oldestVerified)}
              </span>
            )}
          </div>

          <h1 className="text-3xl font-bold text-slate-900 mt-3 break-words">{gadget.name}</h1>
          <p className="text-slate-600">{gadget.brand}</p>

          <dl className="mt-5 grid grid-cols-2 gap-4">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">Price</dt>
              <dd className="text-2xl font-bold text-slate-900 mt-0.5">
                {gadget.price_php != null ? `Php ${gadget.price_php.toLocaleString()}` : <span className="text-base font-medium text-slate-500">Not listed</span>}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">Released</dt>
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

          <div className="flex flex-wrap gap-3 mt-auto pt-6">
            {user ? (
              <Button as={Link} to={`/gadgets/${id}/edit`} variant="outline" icon={Pencil}>
                Edit
              </Button>
            ) : (
              <Button as={Link} to="/login" state={{ from: { pathname: `/gadgets/${id}/edit` } }} variant="outline" icon={LogIn}>
                Log In to Edit
              </Button>
            )}
            <DeleteGadgetButton gadget={gadget} onDeleted={() => navigate('/', { replace: true })} />
          </div>
        </div>
      </article>
      
      <AIComparisonPanel
        gadgetIds={[id]}
        gadgetNames={[gadget.name]}
        category={gadget.category}
        title={`Ask About ${gadget.name}`}
        defaultQuestion=""
        suggestions={['What chip does it use?', 'How long does the battery last?', 'Is it water resistant?']}
        buttonLabel="Ask"
      />

      <SpecManager gadgetId={id} onSpecsChange={setSpecs} />
    </div>
  )
}
