import { useEffect, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { ArrowLeft, Pencil, Trash2, Calendar, ImageOff } from 'lucide-react'
import toast from 'react-hot-toast'
import { api } from '../api/client'
import { useAuth } from '../hooks/useAuth'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { GadgetDetailSkeleton } from '../components/Skeleton'
import SpecManager from '../components/SpecManager'
import { timeAgo } from '../utils/timeAgo'

export default function GadgetDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [gadget, setGadget] = useState(null)
  const [loading, setLoading] = useState(true)
  const [imgError, setImgError] = useState(false)
  const [specs, setSpecs] = useState([])
  const [now] = useState(() => Date.now())

  useDocumentTitle(gadget?.name)

  useEffect(() => {
    api.getGadget(id).then(setGadget).catch((err) => toast.error(err.message)).finally(() => setLoading(false))
  }, [id])

  async function handleDelete() {
    if (!confirm(`Delete ${gadget.name}?`)) return
    try {
      await api.deleteGadget(id)
      toast.success(`${gadget.name} deleted`)
      navigate('/')
    } catch (err) {
      toast.error(err.message)
    }
  }

  if (loading) return <GadgetDetailSkeleton />
  if (!gadget) return null

  const showImage = gadget.image_url && !imgError

  const oldestVerified = specs.length
    ? specs.reduce((oldest, s) => (new Date(s.verified_at) < new Date(oldest) ? s.verified_at : oldest), specs[0].verified_at)
    : null

  const hasOutdated = specs.some((s) => now - new Date(s.verified_at).getTime() > 1000 * 60 * 60 * 24 * 180)

  return (
    <div className="max-w-lg">
      <Link
        to="/"
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-4 transition rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400"
      >
        <ArrowLeft size={15} /> Back to catalog
      </Link>

      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="h-48 w-full bg-gray-50 rounded-lg overflow-hidden mb-4 flex items-center justify-center">
          {showImage ? (
            <img src={gadget.image_url} alt={gadget.name} className="h-full w-full object-cover" onError={() => setImgError(true)} />
          ) : (
            <ImageOff size={28} className="text-gray-300" />
          )}
        </div>

        <span className="inline-block text-xs font-medium text-teal-700 bg-teal-50 rounded-full px-2.5 py-1 uppercase tracking-wide">
          {gadget.category}
        </span>

        {oldestVerified && (
          <span
            className={`ml-2 inline-block text-xs font-medium rounded-full px-2.5 py-1 ${
              hasOutdated ? 'text-amber-700 bg-amber-50' : 'text-gray-500 bg-gray-50'
            }`}
          >
            Verified {timeAgo(oldestVerified)}
          </span>
        )}

        <h1 className="font-display text-2xl font-bold text-gray-900 mt-3">{gadget.name}</h1>
        <p className="text-gray-500">{gadget.brand}</p>

        {gadget.release_date && (
          <p className="flex items-center gap-1.5 text-sm text-gray-500 mt-4">
            <Calendar size={14} /> Released {gadget.release_date}
          </p>
        )}

        {gadget.price_php && (
          <p className="text-2xl font-semibold text-gray-900 mt-4">₱{gadget.price_php.toLocaleString()}</p>
        )}

        <div className="flex gap-3 mt-6">
          <Link
            to={`/gadgets/${id}/edit`}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-teal-600 border border-teal-200 rounded-md hover:bg-teal-50 active:scale-95 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400"
          >
            <Pencil size={14} /> Edit
          </Link>
          {user?.app_metadata?.is_admin && (
            <button
              onClick={handleDelete}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-red-600 border border-red-200 rounded-md hover:bg-red-50 active:scale-95 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
            >
              <Trash2 size={14} /> Delete
            </button>
          )}
        </div>
      </div>

      <SpecManager gadgetId={id} onSpecsChange={setSpecs} />
    </div>
  )
}
