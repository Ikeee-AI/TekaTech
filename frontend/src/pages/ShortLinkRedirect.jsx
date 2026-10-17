import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { LinkIcon } from 'lucide-react'
import { api } from '../api/client'
import EmptyState from '../components/EmptyState'

export default function ShortLinkRedirect() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    api
      .getComparisonBySlug(slug)
      .then((data) => navigate(`/compare?ids=${data.gadget_ids.join(',')}`, { replace: true }))
      .catch(() => setNotFound(true))
  }, [slug, navigate])

  if (notFound) {
    return (
      <EmptyState
        icon={LinkIcon}
        title="This Link Doesn't Exist"
        description="It may have been mistyped, or the comparison was never created."
        action={
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 bg-sage-700 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-sage-800 active:scale-95 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage-400 focus-visible:ring-offset-2"
          >
            Back to Catalog
          </Link>
        }
      />
    )
  }

  return <p role="status" className="text-slate-600 animate-pulse">Loading Comparison…</p>
}