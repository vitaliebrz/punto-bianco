import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiFetch } from '../api'
import { formatDateTime } from '../format'

// Cât de des se verifică notificările noi
const REFRESH_MS = 30_000

// Unde duce un clic pe notificare
const TARGET_BY_TYPE = {
  VIZITA_NOUA_BACK_OFFICE: '/back-office',
  CAZARE_NOUA: '/cazari',
}

export default function NotificationBell() {
  const [data, setData] = useState({ unreadCount: 0, items: [] })
  const [open, setOpen] = useState(false)
  const wrapperRef = useRef(null)
  const navigate = useNavigate()

  const load = useCallback(() => {
    apiFetch('/api/notifications')
      .then(setData)
      .catch(() => {
        // păstrăm ce aveam; reîncercăm la următoarea verificare
      })
  }, [])

  // La pornire, la fiecare 30 de secunde și când utilizatorul revine în tab
  useEffect(() => {
    load()
    const timer = setInterval(load, REFRESH_MS)
    const onVisible = () => {
      if (document.visibilityState === 'visible') load()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [load])

  // Închide lista la clic în afara ei sau la Escape
  useEffect(() => {
    if (!open) return
    const onClick = (event) => {
      if (!wrapperRef.current?.contains(event.target)) setOpen(false)
    }
    const onKey = (event) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  async function openNotification(item) {
    setOpen(false)
    if (!item.readAt) {
      try {
        await apiFetch(`/api/notifications/${item.id}/read`, { method: 'PATCH' })
      } catch {
        // nu blocăm navigarea dacă marcarea nu a reușit
      }
    }
    load()
    navigate(TARGET_BY_TYPE[item.type] ?? '/')
  }

  async function markAllRead() {
    try {
      await apiFetch('/api/notifications/read-all', { method: 'POST' })
    } finally {
      load()
    }
  }

  const { unreadCount, items } = data

  return (
    <div className="bell" ref={wrapperRef}>
      <button
        type="button"
        className="bell-button"
        aria-label={`Notificări (${unreadCount} necitite)`}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
          <path
            fill="currentColor"
            d="M12 22a2.5 2.5 0 0 0 2.45-2h-4.9A2.5 2.5 0 0 0 12 22Zm7-6V11a7 7 0 0 0-5.5-6.84V3.5a1.5 1.5 0 0 0-3 0v.66A7 7 0 0 0 5 11v5l-2 2v1h18v-1l-2-2Z"
          />
        </svg>
        {unreadCount > 0 && (
          <span className="bell-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
        )}
      </button>

      {open && (
        <div className="bell-panel" role="dialog" aria-label="Notificări">
          <div className="bell-panel-header">
            <strong>Notificări</strong>
            {unreadCount > 0 && (
              <button type="button" className="link-button" onClick={markAllRead}>
                Marchează toate ca citite
              </button>
            )}
          </div>

          {items.length === 0 ? (
            <p className="bell-empty">Nu ai notificări.</p>
          ) : (
            <ul className="bell-list">
              {items.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    className={item.readAt ? 'bell-item' : 'bell-item unread'}
                    onClick={() => openNotification(item)}
                  >
                    <span>{item.message}</span>
                    <time dateTime={item.createdAt}>{formatDateTime(item.createdAt)}</time>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
