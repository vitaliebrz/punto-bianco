import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { menuFor, NOTIFIED_ROLES } from '../navigation'
import NotificationBell from './NotificationBell'

// Antetul comun al paginilor pentru utilizatori conectați: meniul rolului, clopoțelul, ieșirea.
export default function AppLayout() {
  const { user, logout } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const menu = menuFor(user.role)

  return (
    <>
      <header className="app-header">
        <div className="header-top">
          <NavLink to="/" className="brand">
            Punto Bianco
          </NavLink>

          <div className="header-actions">
            {NOTIFIED_ROLES.includes(user.role) && <NotificationBell />}
            <span className="user-name">{user.fullName}</span>
            <button type="button" className="btn btn-secondary" onClick={logout}>
              Ieșire
            </button>
            {menu.length > 0 && (
              <button
                type="button"
                className="btn btn-secondary menu-toggle"
                aria-expanded={menuOpen}
                aria-controls="main-menu"
                onClick={() => setMenuOpen((value) => !value)}
              >
                Meniu
              </button>
            )}
          </div>
        </div>

        {menu.length > 0 && (
          <nav id="main-menu" className={menuOpen ? 'main-menu open' : 'main-menu'} aria-label="Meniu">
            {menu.map((item) => (
              <NavLink key={item.path} to={item.path} end onClick={() => setMenuOpen(false)}>
                {item.label}
              </NavLink>
            ))}
          </nav>
        )}
      </header>

      <main className="app-main">
        <Outlet />
      </main>
    </>
  )
}
