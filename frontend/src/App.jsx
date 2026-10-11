import { Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom'
import { Plus, ShieldCheck, LogIn, LogOut } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from './hooks/useAuth'
import ProtectedRoute from './components/ProtectedRoute'
import GadgetList from './pages/GadgetList'
import GadgetDetail from './pages/GadgetDetail'
import AddGadget from './pages/AddGadget'
import EditGadget from './pages/EditGadget'
import ComparePage from './pages/ComparePage'
import AdminCorrections from './pages/AdminCorrections'
import ShortLinkRedirect from './pages/ShortLinkRedirect'
import Login from './pages/Login'
import NotFound from './pages/NotFound'

function App() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, signOut } = useAuth()

  async function handleSignOut() {
    await signOut()
    toast.success('Logged out')
    navigate('/')
  }

  return (
    <div className="min-h-screen bg-gray-50">

      <a href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:bg-teal-600 focus:text-white focus:px-3 focus:py-2 focus:rounded-md focus:text-sm"
      >
        Skip to content
      </a>
      <nav className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link
            to="/"
            className="flex items-baseline gap-2 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 focus-visible:ring-offset-2"
          >
            <span className="font-display text-xl font-medium text-gray-900 tracking-tight">TekaTech</span>
            <span className="hidden sm:inline text-xs text-gray-400">gadget spec assistant</span>
          </Link>
          <div className="flex items-center gap-2">
            {user?.app_metadata?.is_admin && (
              <Link
                to="/corrections"
                aria-label="Review corrections"
                className="p-2 text-gray-500 hover:text-teal-600 rounded-md transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400"
              >
                <ShieldCheck size={18} />
              </Link>
            )}
            {user ? (
              <>
                <span className="hidden sm:inline text-xs text-gray-400 max-w-[140px] truncate">{user.email}</span>
                <button
                  onClick={handleSignOut}
                  aria-label="Log out"
                  className="p-2 text-gray-500 hover:text-red-600 rounded-md transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400"
                >
                  <LogOut size={18} />
                </button>
              </>
            ) : (
              <Link
                to="/login"
                aria-label="Log in"
                className="p-2 text-gray-500 hover:text-teal-600 rounded-md transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400"
              >
                <LogIn size={18} />
              </Link>
            )}
            <Link
              to="/add"
              aria-label="Add gadget"
              className="flex items-center gap-1.5 bg-teal-600 text-white text-sm font-medium px-3 sm:px-3.5 py-2 rounded-md hover:bg-teal-700 active:scale-95 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 focus-visible:ring-offset-2"
            >
              <Plus size={16} /> <span className="hidden sm:inline">Add Gadget</span>
            </Link>
          </div>
        </div>
      </nav>
      <main
        id="main-content"
        key={location.pathname}
        className="max-w-5xl mx-auto px-4 sm:px-6 py-8 animate-fade-in"
      >
        <Routes>
          <Route path="/" element={<GadgetList />} />
          <Route path="/gadgets/:id" element={<GadgetDetail />} />
          <Route
            path="/gadgets/:id/edit"
            element={
              <ProtectedRoute>
                <EditGadget />
              </ProtectedRoute>
            }
          />
          <Route
            path="/add"
            element={
              <ProtectedRoute>
                <AddGadget />
              </ProtectedRoute>
            }
          />
          <Route path="/compare" element={<ComparePage />} />
          <Route
            path="/corrections"
            element={
              <ProtectedRoute adminOnly>
                <AdminCorrections />
              </ProtectedRoute>
            }
          />
          <Route path="/c/:slug" element={<ShortLinkRedirect />} />
          <Route path="/login" element={<Login />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
    </div>
  )
}

export default App
