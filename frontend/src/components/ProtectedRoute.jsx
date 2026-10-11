import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export default function ProtectedRoute({ children, adminOnly = false }) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) return <p className="text-gray-400 animate-pulse">Loading...</p>
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />
  if (adminOnly && !user.app_metadata?.is_admin) return <Navigate to="/" replace />
  return children
}