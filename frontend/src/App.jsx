import { Navigate, Route, Routes } from 'react-router-dom'
import ProtectedRoute from './auth/ProtectedRoute'
import AppLayout from './components/AppLayout'
import { PAGE_ROLES } from './navigation'
import LoginPage from './pages/LoginPage'
import HomePage from './pages/HomePage'
import NewVisitPage from './pages/NewVisitPage'
import VisitDetailsPage from './pages/VisitDetailsPage'
import VisitsPage from './pages/VisitsPage'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route element={<ProtectedRoute roles={PAGE_ROLES.visits} />}>
            <Route path="/vizite" element={<VisitsPage />} />
          </Route>
          <Route element={<ProtectedRoute roles={PAGE_ROLES.newVisit} />}>
            <Route path="/vizite/noua" element={<NewVisitPage />} />
          </Route>
          <Route element={<ProtectedRoute roles={PAGE_ROLES.visitDetails} />}>
            <Route path="/vizite/:id" element={<VisitDetailsPage />} />
          </Route>
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
