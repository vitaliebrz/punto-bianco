import { Navigate, Outlet, useLocation } from 'react-router-dom'
import Loader from '../components/Loader'
import { ErrorState } from '../components/PageState'
import { useAuth } from './useAuth'

// Pagini doar pentru utilizatori conectați. Opțional: doar anumite roluri (ADMIN are acces mereu).
export default function ProtectedRoute({ roles }) {
  const { user, loading, sessionError, checkSession } = useAuth()
  const location = useLocation()

  if (loading) {
    return <Loader fullScreen />
  }

  // Sesiunea nu a putut fi verificată (server indisponibil): nu deconectăm, oferim reîncercare
  if (!user && sessionError) {
    return (
      <div className="flex min-h-dvh items-center justify-center px-4">
        <div className="w-full max-w-md">
          <ErrorState message={sessionError} onRetry={checkSession} />
        </div>
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
