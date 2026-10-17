import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

export default function BackLink({ to, children }) {
  return (
    <Link
      to={to}
      className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 mb-4 py-1 transition rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage-400"
    >
      <ArrowLeft size={16} aria-hidden="true" /> {children}
    </Link>
  )
}
