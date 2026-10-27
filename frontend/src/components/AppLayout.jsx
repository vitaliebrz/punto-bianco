import { useEffect, useRef, useState } from 'react'
import { ClipboardText } from '@phosphor-icons/react/ClipboardText'
import { Buildings } from '@phosphor-icons/react/Buildings'
import { List } from '@phosphor-icons/react/List'
import { PlusCircle } from '@phosphor-icons/react/PlusCircle'
import { SignOut } from '@phosphor-icons/react/SignOut'
import { UserGear } from '@phosphor-icons/react/UserGear'
import { UsersThree } from '@phosphor-icons/react/UsersThree'
import { Van } from '@phosphor-icons/react/Van'
import { X } from '@phosphor-icons/react/X'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { cn } from '../cn'
import { menuFor, NOTIFIED_ROLES } from '../navigation'
import { ROLE_LABELS } from '../roles'
import Logo from './Logo'
import NotificationBell from './NotificationBell'

// Iconița fiecărei pagini din meniu
const MENU_ICONS = {
  '/vizite': UsersThree,
  '/vizite/noua': PlusCircle,
  '/back-office': ClipboardText,
  '/cazari': Buildings,
  '/transferuri': Van,
  '/utilizatori': UserGear,
}

// Inițialele pentru avatar: „Elena Popescu” -> „EP”
const initials = (fullName) =>
  fullName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('')

// Cadrul paginilor pentru utilizatori conectați.
// Calculator (lg): bară laterală fixă (logo, meniul rolului, utilizatorul) + bară sus cu clopoțelul.
// Telefon: bară sus (meniu, logo, clopoțel); bara laterală devine un panou care glisează din stânga.
export default function AppLayout() {
  const { user, logout } = useAuth()
  const { pathname } = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  // La orice schimbare de pagină (clic în meniu, pe logo, butonul Înapoi al telefonului) meniul
  // de pe telefon se închide singur. (Starea se ajustează în timpul randării, modelul recomandat de React.)
  const [menuPath, setMenuPath] = useState(pathname)
  if (menuPath !== pathname) {
    setMenuPath(pathname)
    setMenuOpen(false)
  }
  const menuButtonRef = useRef(null)
  const closeButtonRef = useRef(null)
  const menu = menuFor(user.role)
  const hasBell = NOTIFIED_ROLES.includes(user.role)

  // Închis cu X, Escape sau clic pe fundal: focusul revine pe butonul care l-a deschis
  const closeMenu = () => {
    setMenuOpen(false)
    menuButtonRef.current?.focus()
  }

  // La deschidere, focusul intră în meniu (pentru tastatură și cititoare de ecran)
  useEffect(() => {
    if (menuOpen) closeButtonRef.current?.focus()
  }, [menuOpen])

  // Escape închide meniul; pe ecran lat (ex. tabletă rotită) meniul nu mai e un panou, deci îl închidem
  useEffect(() => {
    if (!menuOpen) return
    const onKey = (event) => {
      if (event.key === 'Escape') closeMenu()
    }
    const wide = window.matchMedia?.('(min-width: 1024px)')
    const onWide = () => {
      if (wide.matches) setMenuOpen(false)
    }
    document.addEventListener('keydown', onKey)
    wide?.addEventListener?.('change', onWide)
    return () => {
      document.removeEventListener('keydown', onKey)
      wide?.removeEventListener?.('change', onWide)
    }
  }, [menuOpen])

  return (
    <div className="min-h-dvh">
      {/* Fundal întunecat în spatele meniului deschis pe telefon */}
      {menuOpen && (
        <div
          aria-hidden="true"
          className="fixed inset-0 z-30 animate-fade-in bg-ink-900/30 lg:hidden"
          onClick={closeMenu}
        />
      )}

      <aside
        id="main-sidebar"
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-ink-200/70 bg-white',
          'transition-[transform,visibility] duration-200 ease-out lg:visible lg:translate-x-0',
          menuOpen ? 'visible translate-x-0 shadow-popover' : 'max-lg:invisible max-lg:-translate-x-full',
        )}
      >
        <div className="flex h-16 items-center justify-between px-5">
          <NavLink to="/" onClick={() => setMenuOpen(false)} className="rounded-lg text-ink-700 focus-visible:ring-2 focus-visible:ring-mint-500 focus-visible:outline-none">
            <Logo />
          </NavLink>
          <button
            ref={closeButtonRef}
            type="button"
            aria-label="Închide meniul"
            className="flex size-10 items-center justify-center rounded-xl text-ink-500 hover:bg-ink-100 lg:hidden"
            onClick={closeMenu}
          >
            <X size={20} weight="bold" aria-hidden="true" />
          </button>
        </div>

        {menu.length > 0 && (
          <nav aria-label="Meniu" className="flex-1 overflow-y-auto px-3 py-4">
            <ul className="flex flex-col gap-1">
              {menu.map((item) => {
                const Icon = MENU_ICONS[item.path]
                return (
                  <li key={item.path}>
                    <NavLink
                      to={item.path}
                      end
                      // pe pagina curentă adresa nu se schimbă, deci închidem explicit
                      onClick={() => setMenuOpen(false)}
                      className={({ isActive }) =>
                        cn(
                          'group flex h-11 items-center gap-3 rounded-xl px-3 text-[15px] font-medium transition-colors',
                          'focus-visible:ring-2 focus-visible:ring-mint-500 focus-visible:outline-none',
                          isActive ? 'bg-mint-100 text-ink-900' : 'text-ink-600 hover:bg-ink-100 hover:text-ink-900',
                        )
                      }
                    >
                      {({ isActive }) => (
                        <>
                          {Icon && (
                            <Icon
                              size={20}
                              weight={isActive ? 'fill' : 'regular'}
                              aria-hidden="true"
                              className={isActive ? 'text-mint-700' : 'text-ink-400 group-hover:text-ink-600'}
                            />
                          )}
                          {item.label}
                        </>
                      )}
                    </NavLink>
                  </li>
                )
              })}
            </ul>
          </nav>
        )}

        <div className="border-t border-ink-200/70 p-3">
          <div className="flex items-center gap-3 rounded-xl px-2 py-2">
            <span
              aria-hidden="true"
              className="flex size-10 shrink-0 items-center justify-center rounded-full bg-mint-200 text-sm font-bold text-ink-800"
            >
              {initials(user.fullName)}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[15px] font-medium text-ink-900">{user.fullName}</p>
              <p className="truncate text-[13px] text-ink-500">{ROLE_LABELS[user.role] ?? user.role}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={logout}
            className="mt-1 flex h-10 w-full items-center gap-3 rounded-xl px-3 text-sm font-medium text-ink-600 transition-colors hover:bg-ink-100 hover:text-ink-900 focus-visible:ring-2 focus-visible:ring-mint-500 focus-visible:outline-none"
          >
            <SignOut size={18} aria-hidden="true" className="text-ink-400" />
            Ieșire
          </button>
        </div>
      </aside>

      {/* Cât e deschis meniul, pagina din spate nu poate fi atinsă sau selectată cu tastatura */}
      <div className="lg:pl-72" inert={menuOpen}>
        {/* Pe calculator bara de sus apare doar pentru clopoțel (meniul și logo-ul sunt în bara laterală) */}
        <header
          className={cn(
            'sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-ink-200/70 bg-white/85 px-4 backdrop-blur-md sm:px-6 lg:justify-end lg:px-8',
            !hasBell && 'lg:hidden',
          )}
        >
          <button
            ref={menuButtonRef}
            type="button"
            aria-label="Deschide meniul"
            aria-expanded={menuOpen}
            aria-controls="main-sidebar"
            className="flex size-10 items-center justify-center rounded-xl text-ink-600 hover:bg-ink-100 lg:hidden"
            onClick={() => setMenuOpen(true)}
          >
            <List size={22} weight="bold" aria-hidden="true" />
          </button>
          <span className="text-ink-700 lg:hidden">
            <Logo markClassName="size-9 bg-mint-300" wordmarkClassName="h-3 text-ink-700" />
          </span>
          <div className="ml-auto flex items-center gap-2 lg:ml-0">
            {hasBell && <NotificationBell />}
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
