import { lazy, Suspense } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute'
import Navbar from './components/Navbar'
import ServerWakeBanner from './components/ServerWakeBanner'
import AuthLinkNotice from './components/AuthLinkNotice'
import RouteErrorBoundary from './components/RouteErrorBoundary'
import { useRouteFocus } from './hooks/useRouteFocus'
import GadgetList from './pages/GadgetList'
import NotFound from './pages/NotFound'

// The catalog (landing page) and the 404 page stay in the main bundle; every other
// route is fetched on first visit, which keeps the initial download small.
const GadgetDetail = lazy(() => import('./pages/GadgetDetail'))
const AddGadget = lazy(() => import('./pages/AddGadget'))
const EditGadget = lazy(() => import('./pages/EditGadget'))
const ComparePage = lazy(() => import('./pages/ComparePage'))
const AdminCorrections = lazy(() => import('./pages/AdminCorrections'))
const MySuggestions = lazy(() => import('./pages/MySuggestions'))
const MyGadgets = lazy(() => import('./pages/MyGadgets'))
const Account = lazy(() => import('./pages/Account'))
const ShortLinkRedirect = lazy(() => import('./pages/ShortLinkRedirect'))
const Login = lazy(() => import('./pages/Login'))
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'))
const ResetPassword = lazy(() => import('./pages/ResetPassword'))

function PageLoading() {
  return <p role="status" className="text-slate-600 animate-pulse">Loading page…</p>
}

function App() {
  const location = useLocation()
  useRouteFocus(location.pathname, 'main-content')

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">

      <a href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:bg-sage-700 focus:text-white focus:px-3 focus:py-2 focus:rounded-lg focus:text-sm"
      >
        Skip to Content
      </a>
      <Navbar />
      <ServerWakeBanner />
      <AuthLinkNotice />
      <main
        id="main-content"
        key={location.pathname}
        // Focus target for the skip link and for useRouteFocus; not in the tab order.
        tabIndex={-1}
        // One width for every page (rebrand: no wide empty side gutters).
        className="max-w-[1320px] mx-auto px-4 sm:px-6 py-6 animate-fade-in outline-none"
      >
        <RouteErrorBoundary>
          <Suspense fallback={<PageLoading />}>
            <Routes>
              <Route path="/" element={<GadgetList />} />
              {/* Signed-out visitors only browse the catalog (owner decision, 14 Nov 2026): phone
                  pages, compare and shared comparison links send them to log in and back. */}
              <Route
                path="/gadgets/:id"
                element={
                  <ProtectedRoute>
                    <GadgetDetail />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/gadgets/:id/edit"
                element={
                  <ProtectedRoute adminOnly>
                    <EditGadget />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/add"
                element={
                  <ProtectedRoute adminOnly>
                    <AddGadget />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/compare"
                element={
                  <ProtectedRoute>
                    <ComparePage />
                  </ProtectedRoute>
                }
              />
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
              <Route
                path="/my-gadgets"
                element={
                  <ProtectedRoute>
                    <MyGadgets />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/account"
                element={
                  <ProtectedRoute>
                    <Account />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/c/:slug"
                element={
                  <ProtectedRoute>
                    <ShortLinkRedirect />
                  </ProtectedRoute>
                }
              />
              <Route path="/login" element={<Login />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </RouteErrorBoundary>
      </main>
    </div>
  )
}

export default App
