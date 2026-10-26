import { Navigate } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { menuFor } from '../navigation'

// Pagina „/”: fiecare rol ajunge direct la prima lui pagină (ex. Șofer -> Calendar)
export default function HomeRedirect() {
  const { user } = useAuth()
  const [first] = menuFor(user.role)
  return <Navigate to={first.path} replace />
}
