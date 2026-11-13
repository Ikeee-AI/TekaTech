import { Link } from 'react-router-dom'
import { SearchX } from 'lucide-react'
import { useDocumentTitle } from '../hooks/useDocumentTitle'

export default function NotFound() {
  useDocumentTitle('Page Not Found')
  return (
    <div className="flex flex-col items-center justify-center text-center py-24 px-6">
      <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mb-4">
        <SearchX size={26} className="text-gray-500" aria-hidden="true" />
      </div>
      <p className="text-sm font-medium text-sage-700">404</p>
      <h1 className="text-3xl font-extrabold tracking-[-0.045em] text-slate-900 mt-1">Page Not Found</h1>
      <p className="text-sm text-gray-500 mt-1 max-w-sm">
        That page doesn't exist — it might have been moved, or the link is off.
      </p>
      <Link
        to="/"
        className="mt-6 inline-flex items-center gap-1.5 bg-sage-700 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-sage-800 active:scale-95 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage-600 focus-visible:ring-offset-2"
      >
        Back to Catalog
      </Link>
    </div>
  )
}