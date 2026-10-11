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
        title="This link doesn't exist"
        description="It may have been mistyped, or the comparison was never created."
        action={
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 bg-teal-600 text-white text-sm font-medium px-4 py-2 rounded-md hover:bg-teal-700 active:scale-95 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 focus-visible:ring-offset-2"
          >
            Back to catalog
          </Link>
        }
      />
    )
  }

  return <p className="text-gray-400 animate-pulse">Loading comparison...</p>
}