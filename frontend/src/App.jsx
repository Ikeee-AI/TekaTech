import { Routes, Route, useLocation } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute'
import Navbar from './components/Navbar'
import ServerWakeBanner from './components/ServerWakeBanner'
import GadgetList from './pages/GadgetList'
import GadgetDetail from './pages/GadgetDetail'
import AddGadget from './pages/AddGadget'
import EditGadget from './pages/EditGadget'
import ComparePage from './pages/ComparePage'
import AdminCorrections from './pages/AdminCorrections'
import MySuggestions from './pages/MySuggestions'
import ShortLinkRedirect from './pages/ShortLinkRedirect'
import Login from './pages/Login'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import NotFound from './pages/NotFound'

function App() {
  const location = useLocation()

  return (
    <div className="min-h-screen bg-slate-50">

      <a href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:bg-sage-700 focus:text-white focus:px-3 focus:py-2 focus:rounded-lg focus:text-sm"
      >
        Skip to Content
      </a>
      <Navbar />
      <ServerWakeBanner />
      <main
        id="main-content"
        key={location.pathname}
        className={`${location.pathname === '/' ? 'max-w-[1600px]' : 'max-w-5xl'} mx-auto px-4 sm:px-6 py-8 animate-fade-in`}
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
          <Route
            path="/my-suggestions"
            element={
              <ProtectedRoute>
                <MySuggestions />
              </ProtectedRoute>
            }
          />
          <Route path="/c/:slug" element={<ShortLinkRedirect />} />
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
    </div>
  )
}

export default App
