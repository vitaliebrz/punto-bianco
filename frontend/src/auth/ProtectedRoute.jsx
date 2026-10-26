import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from './useAuth'

// Pagini doar pentru utilizatori conectați. Opțional: doar anumite roluri (ADMIN are acces mereu).
export default function ProtectedRoute({ roles }) {
  const { user, loading, sessionError, checkSession } = useAuth()
  const location = useLocation()

  if (loading) {
    return <p className="page-status">Se încarcă…</p>
  }

  // Sesiunea nu a putut fi verificată (server indisponibil): nu deconectăm, oferim reîncercare
  if (!user && sessionError) {
    return (
      <div className="page-status">
        <p role="alert">{sessionError}</p>
        <button type="button" className="btn btn-primary" onClick={checkSession}>
          Reîncearcă
        </button>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  if (roles && user.role !== 'ADMIN' && !roles.includes(user.role)) {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}
