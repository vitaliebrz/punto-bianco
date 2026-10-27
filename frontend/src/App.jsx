import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import ProtectedRoute from './auth/ProtectedRoute'
import AppLayout from './components/AppLayout'
import HomeRedirect from './components/HomeRedirect'
import Loader from './components/Loader'
import ScrollToTop from './components/ScrollToTop'
import { PAGE_ROLES } from './navigation'
import AccommodationsPage from './pages/AccommodationsPage'
import BackOfficePage from './pages/BackOfficePage'
import LoginPage from './pages/LoginPage'
import NewVisitPage from './pages/NewVisitPage'
import VisitDetailsPage from './pages/VisitDetailsPage'
import VisitsPage from './pages/VisitsPage'

// Calendarul (FullCalendar) e mare: se descarcă doar când cineva deschide pagina lui
const TransfersCalendarPage = lazy(() => import('./pages/TransfersCalendarPage'))

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route path="/" element={<HomeRedirect />} />
            <Route element={<ProtectedRoute roles={PAGE_ROLES.visits} />}>
              <Route path="/vizite" element={<VisitsPage />} />
            </Route>
            <Route element={<ProtectedRoute roles={PAGE_ROLES.newVisit} />}>
              <Route path="/vizite/noua" element={<NewVisitPage />} />
            </Route>
            <Route element={<ProtectedRoute roles={PAGE_ROLES.visitDetails} />}>
              <Route path="/vizite/:id" element={<VisitDetailsPage />} />
            </Route>
            <Route element={<ProtectedRoute roles={PAGE_ROLES.backOffice} />}>
              <Route path="/back-office" element={<BackOfficePage />} />
            </Route>
            <Route element={<ProtectedRoute roles={PAGE_ROLES.accommodations} />}>
              <Route path="/cazari" element={<AccommodationsPage />} />
            </Route>
            <Route element={<ProtectedRoute roles={PAGE_ROLES.transfers} />}>
              <Route
                path="/transferuri"
                element={
                  <Suspense fallback={<Loader />}>
                    <TransfersCalendarPage />
                  </Suspense>
                }
              />
            </Route>
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  )
}
