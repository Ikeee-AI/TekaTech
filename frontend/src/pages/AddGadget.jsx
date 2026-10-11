import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import toast from 'react-hot-toast'
import { api } from '../api/client'
import { useDocumentTitle } from '../hooks/useDocumentTitle'

export default function AddGadget() {
  useDocumentTitle('Add Gadget')
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', brand: '', category: '', release_date: '', price_php: '', image_url: '' })
  const [submitting, setSubmitting] = useState(false)

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
      const created = await api.createGadget(payload)
      toast.success(`${created.name} added`)
      navigate(`/gadgets/${created.id}`)
    } catch (err) {
      toast.error(err.message)
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-lg">
      <Link
        to="/"
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-4 transition rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400"
      >
        <ArrowLeft size={15} /> Back to catalog
      </Link>
      <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
        <h1 className="font-display text-xl font-bold text-gray-900">Add Gadget</h1>
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700">Name</label>
          <input id="name" required value={form.name} onChange={(e) => update('name', e.target.value)}
            className="mt-1 w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:border-teal-400 focus:ring-1 focus:ring-teal-400 outline-none transition" />
        </div>
        <div>
          <label htmlFor="brand" className="block text-sm font-medium text-gray-700">Brand</label>
          <input id="brand" required value={form.brand} onChange={(e) => update('brand', e.target.value)}
            className="mt-1 w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:border-teal-400 focus:ring-1 focus:ring-teal-400 outline-none transition" />
        </div>
        <div>
          <label htmlFor="category" className="block text-sm font-medium text-gray-700">Category</label>
          <input id="category" required value={form.category} onChange={(e) => update('category', e.target.value)}
            placeholder="smartphone, laptop, ..."
            className="mt-1 w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:border-teal-400 focus:ring-1 focus:ring-teal-400 outline-none transition" />
        </div>
        <div>
          <label htmlFor="release_date" className="block text-sm font-medium text-gray-700">Release date</label>
          <input id="release_date" type="date" value={form.release_date} onChange={(e) => update('release_date', e.target.value)}
            className="mt-1 w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:border-teal-400 focus:ring-1 focus:ring-teal-400 outline-none transition" />
        </div>
        <div>
          <label htmlFor="price_php" className="block text-sm font-medium text-gray-700">Price (₱)</label>
          <input id="price_php" type="number" value={form.price_php} onChange={(e) => update('price_php', e.target.value)}
            className="mt-1 w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:border-teal-400 focus:ring-1 focus:ring-teal-400 outline-none transition" />
        </div>
        <div>
          <label htmlFor="image_url" className="block text-sm font-medium text-gray-700">Image URL</label>
          <input id="image_url" type="url" value={form.image_url} onChange={(e) => update('image_url', e.target.value)}
            placeholder="https://..."
            className="mt-1 w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:border-teal-400 focus:ring-1 focus:ring-teal-400 outline-none transition" />
          <p className="text-xs text-gray-400 mt-1">Paste a link to a product photo. File upload comes later.</p>
        </div>
        <button type="submit" disabled={submitting}
          className="w-full bg-teal-600 text-white font-medium py-2.5 rounded-md hover:bg-teal-700 active:scale-95 disabled:opacity-50 disabled:active:scale-100 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 focus-visible:ring-offset-2">
          {submitting ? 'Saving...' : 'Save Gadget'}
        </button>
      </form>
    </div>
  )
}