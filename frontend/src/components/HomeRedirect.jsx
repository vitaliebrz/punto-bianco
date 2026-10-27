import { Navigate } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { menuFor } from '../navigation'
import { ErrorState } from './PageState'

// Pagina „/”: fiecare rol ajunge direct la prima lui pagină (ex. Șofer -> Calendar)
export default function HomeRedirect() {
  const { user } = useAuth()
  const [first] = menuFor(user.role)
  // Un rol fără nicio pagină (ex. un rol nou, încă neadăugat în meniu): mesaj, nu ecran alb
  if (!first) return <ErrorState message="Contul tău nu are acces la nicio pagină. Contactează administratorul." />
  return <Navigate to={first.path} replace />
}
