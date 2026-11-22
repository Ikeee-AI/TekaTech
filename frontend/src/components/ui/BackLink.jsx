import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

export default function BackLink({ to, children }) {
  return (
    <Link
      to={to}
      className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 self-start -mt-2 mb-1 py-1 min-h-9 transition rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage-600"
    >
      <ArrowLeft size={16} aria-hidden="true" /> {children}
    </Link>
  )
}
