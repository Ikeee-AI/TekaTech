import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import toast from 'react-hot-toast'
import { api } from '../api/client'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { FormSkeleton } from '../components/Skeleton'

export default function EditGadget() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [form, setForm] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  useDocumentTitle(form ? `Edit ${form.name}` : 'Edit Gadget')

  useEffect(() => {
    api.getGadget(id)
      .then((g) =>
        setForm({
          name: g.name ?? '',
          brand: g.brand ?? '',
          category: g.category ?? '',
          release_date: g.release_date ?? '',
          price_php: g.price_php ?? '',
          image_url: g.image_url ?? '',
        })
      )
      .catch((err) => toast.error(err.message))
      .finally(() => setLoading(false))
  }, [id])

  const update = (field, value) => setForm((f) => ({ ...f, [field]: value }))

  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitting(true)
    try {
      const payload = {
        ...form,
        price_php: form.price_php ? Number(form.price_php) : undefined,
        release_date: form.release_date || undefined,
        image_url: form.image_url || undefined,
      }
      await api.updateGadget(id, payload)
      toast.success('Changes saved')
      navigate(`/gadgets/${id}`)
    } catch (err) {
      toast.error(err.message)
      setSubmitting(false)
    }
  }

  if (loading) return <FormSkeleton />
  if (!form) return null

  return (
    <div className="max-w-lg">
      <Link
        to={`/gadgets/${id}`}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-4 transition rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400"
      >
        <ArrowLeft size={15} /> Back to gadget
      </Link>
      <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
        <h1 className="font-display text-xl font-bold text-gray-900">Edit Gadget</h1>
        <div>
          <label htmlFor="e-name" className="block text-sm font-medium text-gray-700">Name</label>
          <input id="e-name" required value={form.name} onChange={(e) => update('name', e.target.value)}
            className="mt-1 w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:border-teal-400 focus:ring-1 focus:ring-teal-400 outline-none transition" />
        </div>
        <div>
          <label htmlFor="e-brand" className="block text-sm font-medium text-gray-700">Brand</label>
          <input id="e-brand" required value={form.brand} onChange={(e) => update('brand', e.target.value)}
            className="mt-1 w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:border-teal-400 focus:ring-1 focus:ring-teal-400 outline-none transition" />
        </div>
        <div>
          <label htmlFor="e-category" className="block text-sm font-medium text-gray-700">Category</label>
          <input id="e-category" required value={form.category} onChange={(e) => update('category', e.target.value)}
            className="mt-1 w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:border-teal-400 focus:ring-1 focus:ring-teal-400 outline-none transition" />
        </div>
        <div>
          <label htmlFor="e-release_date" className="block text-sm font-medium text-gray-700">Release date</label>
          <input id="e-release_date" type="date" value={form.release_date} onChange={(e) => update('release_date', e.target.value)}
            className="mt-1 w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:border-teal-400 focus:ring-1 focus:ring-teal-400 outline-none transition" />
        </div>
        <div>
          <label htmlFor="e-price_php" className="block text-sm font-medium text-gray-700">Price (₱)</label>
          <input id="e-price_php" type="number" value={form.price_php} onChange={(e) => update('price_php', e.target.value)}
            className="mt-1 w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:border-teal-400 focus:ring-1 focus:ring-teal-400 outline-none transition" />
        </div>
        <div>
          <label htmlFor="e-image_url" className="block text-sm font-medium text-gray-700">Image URL</label>
          <input id="e-image_url" type="url" value={form.image_url} onChange={(e) => update('image_url', e.target.value)}
            placeholder="https://..."
            className="mt-1 w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:border-teal-400 focus:ring-1 focus:ring-teal-400 outline-none transition" />
        </div>
        <div className="flex gap-3">
          <button type="submit" disabled={submitting}
            className="flex-1 bg-teal-600 text-white font-medium py-2.5 rounded-md hover:bg-teal-700 active:scale-95 disabled:opacity-50 disabled:active:scale-100 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 focus-visible:ring-offset-2">
            {submitting ? 'Saving...' : 'Save Changes'}
          </button>
          <button type="button" onClick={() => navigate(`/gadgets/${id}`)}
            className="px-4 py-2.5 text-sm font-medium text-gray-600 border border-gray-200 rounded-md hover:bg-gray-50 active:scale-95 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400">
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}