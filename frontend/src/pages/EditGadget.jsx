import { useEffect, useState } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { api } from '../api/client'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { FormSkeleton } from '../components/Skeleton'
import GadgetForm from '../components/GadgetForm'
import DeleteGadgetButton from '../components/DeleteGadgetButton'
import BackLink from '../components/ui/BackLink'
import Button from '../components/ui/Button'
import ErrorState from '../components/ui/ErrorState'
import { useAuth } from '../hooks/useAuth'
import { friendlyError } from '../utils/requestErrors'

function toFormValues(g) {
  return {
    name: g.name ?? '',
    brand: g.brand ?? '',
    category: g.category ?? '',
    release_date: g.release_date ?? '',
    price_php: g.price_php != null ? String(g.price_php) : '',
    image_url: g.image_url ?? '',
    price_source_url: g.price_source_url ?? '',
    price_checked_at: g.price_checked_at ?? '',
    store_url: g.store_url ?? '',
    price_is_launch: Boolean(g.price_is_launch),
  }
}

export default function EditGadget() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [state, setState] = useState({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)
  useDocumentTitle(state.gadget ? `Edit ${state.gadget.name}` : 'Edit Gadget')

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- app-wide fetch convention (see CLAUDE.md)
    setState({ status: 'loading' })
    api
      .getGadget(id)
      .then((gadget) => setState({ status: 'ready', gadget }))
      .catch((err) => setState({ status: 'error', error: friendlyError(err) }))
  }, [id, attempt])

  async function handleSubmit(payload) {
    await api.updateGadget(id, payload)
    toast.success('Changes saved')
    navigate(`/gadgets/${id}`)
  }

  if (state.status === 'loading') return <FormSkeleton />

  if (state.status === 'error') {
    return (
      <div className="max-w-3xl mx-auto">
        <BackLink to="/">Back to Catalog</BackLink>
        <ErrorState
          title="Couldn't Load This Gadget"
          message={state.error}
          onRetry={() => setAttempt((n) => n + 1)}
          secondaryAction={
            <Button as={Link} to="/" variant="secondary">
              Back to Catalog
            </Button>
          }
        />
      </div>
    )
  }

  const { gadget } = state

  return (
    <div className="max-w-3xl mx-auto">
      <BackLink to={`/gadgets/${id}`}>Back to Gadget</BackLink>
      <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 shadow-xs">
        <h1 className="text-3xl font-extrabold tracking-[-0.045em] text-slate-900">Edit Gadget</h1>
        <p className="text-sm text-slate-600 mt-1 mb-6">
          Update the catalog details for <strong className="text-slate-800">{gadget.name}</strong>.
        </p>
        <GadgetForm
          initialValues={toFormValues(gadget)}
          onSubmit={handleSubmit}
          submitLabel="Save Changes"
          onCancel={() => navigate(`/gadgets/${id}`)}
          isEdit
          uploadImage={(file) => api.uploadGadgetImage(id, file)}
        />
      </div>

      {user?.app_metadata?.is_admin && (
        <section
          aria-labelledby="danger-zone-title"
          className="mt-6 bg-white border border-red-200 rounded-xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        >
          <div>
            <h2 id="danger-zone-title" className="text-base font-bold text-red-800">
              Delete This Gadget
            </h2>
            <p className="text-sm text-slate-600 mt-0.5">Removes it and its specs from the catalog for everyone.</p>
          </div>
          <DeleteGadgetButton gadget={gadget} onDeleted={() => navigate('/', { replace: true })} />
        </section>
      )}
    </div>
  )
}
