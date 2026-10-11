import { Link } from 'react-router-dom'
import { SearchX } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center text-center py-24 px-6">
      <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mb-4">
        <SearchX size={26} className="text-gray-400" />
      </div>
      <p className="text-sm font-medium text-teal-600">404</p>
      <h1 className="font-display text-xl font-bold text-gray-900 mt-1">Page not found</h1>
      <p className="text-sm text-gray-500 mt-1 max-w-sm">
        That page doesn't exist — it might have been moved, or the link is off.
      </p>
      <Link
        to="/"
        className="mt-6 inline-flex items-center gap-1.5 bg-teal-600 text-white text-sm font-medium px-4 py-2 rounded-md hover:bg-teal-700 active:scale-95 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 focus-visible:ring-offset-2"
      >
        Back to catalog
      </Link>
    </div>
  )
}