import { useAuth } from '../auth/useAuth'
import { ROLE_LABELS, isReadOnly } from '../roles'

export default function HomePage() {
  const { user } = useAuth()

  return (
    <section className="welcome-card">
      <h1>Bun venit, {user.fullName}!</h1>
      <span className="role-badge">{ROLE_LABELS[user.role] ?? user.role}</span>
      {isReadOnly(user.role) && (
        <p className="readonly-note">Rolul tău are acces doar la vizualizare.</p>
      )}
    </section>
  )
}
