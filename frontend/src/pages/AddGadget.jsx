import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { api } from '../api/client'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import GadgetForm from '../components/GadgetForm'
import BackLink from '../components/ui/BackLink'
import { EMPTY_GADGET } from '../utils/gadgetValidation'

export default function AddGadget() {
  useDocumentTitle('Add Gadget')
  const navigate = useNavigate()

  async function handleSubmit(payload) {
    const created = await api.createGadget(payload)
    toast.success(`${created.name} added`)
    navigate(`/gadgets/${created.id}`)
  }

  return (
    <div className="max-w-xl mx-auto">
      <BackLink to="/">Back to Catalog</BackLink>
      <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 shadow-xs">
        <h1 className="text-2xl font-bold text-slate-900">Add Gadget</h1>
        <p className="text-sm text-slate-600 mt-1 mb-6">
          Create the catalog entry first. You can add spec sheets on the next screen.
        </p>
        <GadgetForm initialValues={EMPTY_GADGET} onSubmit={handleSubmit} submitLabel="Save Gadget" onCancel={() => navigate('/')} />
      </div>
    </div>
  )
}
