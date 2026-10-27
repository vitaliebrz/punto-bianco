import { useCallback, useEffect, useRef, useState } from 'react'
import { Bed } from '@phosphor-icons/react/Bed'
import { Bell } from '@phosphor-icons/react/Bell'
import { CalendarPlus } from '@phosphor-icons/react/CalendarPlus'
import { Checks } from '@phosphor-icons/react/Checks'
import { Tray } from '@phosphor-icons/react/Tray'
import { useNavigate } from 'react-router-dom'
import { apiFetch } from '../api'
import { cn } from '../cn'
import { formatDateTime } from '../format'

// Iconița după tipul notificării
const ICON_BY_TYPE = {
  VIZITA_NOUA_BACK_OFFICE: CalendarPlus,
  CAZARE_NOUA: Bed,
}

// Cât de des se verifică notificările noi
const REFRESH_MS = 30_000

// Unde duce un clic pe notificare: detaliile vizitei; fără vizită, pagina rolului
const PAGE_BY_TYPE = {
  VIZITA_NOUA_BACK_OFFICE: '/back-office',
  CAZARE_NOUA: '/cazari',
}

const targetOf = (item) => (item.visitId ? `/vizite/${item.visitId}` : (PAGE_BY_TYPE[item.type] ?? '/'))

export default function NotificationBell() {
  const [data, setData] = useState({ unreadCount: 0, items: [] })
  const [open, setOpen] = useState(false)
  const [actionError, setActionError] = useState('')
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
    navigate(targetOf(item))
  }

  async function markAllRead() {
    setActionError('')
    try {
      await apiFetch('/api/notifications/read-all', { method: 'POST' })
    } catch (err) {
      // altfel eroarea ar rămâne neprinsă, iar utilizatorul n-ar afla că marcarea nu a reușit
      setActionError(`Notificările nu au putut fi marcate ca citite. ${err.message}`)
    } finally {
      load()
    }
  }

  function toggle() {
    setActionError('')
    setOpen((value) => !value)
  }

  const { unreadCount, items } = data

  return (
    <div className="relative" ref={wrapperRef}>
      <button
        type="button"
        aria-label={`Notificări (${unreadCount} necitite)`}
        aria-expanded={open}
        onClick={toggle}
        className={cn(
          'relative flex size-10 items-center justify-center rounded-xl text-ink-600 transition-colors',
          'hover:bg-ink-100 hover:text-ink-900 focus-visible:ring-2 focus-visible:ring-mint-500 focus-visible:outline-none',
          open && 'bg-ink-100 text-ink-900',
        )}
      >
        <Bell size={22} weight={unreadCount > 0 ? 'fill' : 'regular'} aria-hidden="true" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[11px] font-bold text-white ring-2 ring-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Notificări"
          className={cn(
            'z-30 origin-top-right animate-pop-in overflow-hidden rounded-2xl bg-white shadow-popover ring-1 ring-ink-200/70',
            // telefon: pe toată lățimea, sub bara de sus; calculator: sub clopoțel
            'max-sm:fixed max-sm:inset-x-3 max-sm:top-18 sm:absolute sm:top-full sm:right-0 sm:mt-2 sm:w-96',
          )}
        >
          <div className="flex items-center justify-between gap-3 border-b border-ink-100 px-4 py-3">
            <p className="text-[15px] font-bold text-ink-900">Notificări</p>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-[13px] font-medium text-mint-700 hover:bg-mint-50 focus-visible:ring-2 focus-visible:ring-mint-500 focus-visible:outline-none"
              >
                <Checks size={16} weight="bold" aria-hidden="true" />
                Marchează toate ca citite
              </button>
            )}
          </div>

          {actionError && (
            <p role="alert" className="border-b border-red-100 bg-red-50 px-4 py-2.5 text-[13px] font-medium text-red-800">
              {actionError}
            </p>
          )}

          {items.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
              <Tray size={28} weight="duotone" aria-hidden="true" className="text-ink-400" />
              <p className="text-sm text-ink-500">Nu ai notificări.</p>
            </div>
          ) : (
            <ul className="max-h-[min(28rem,70dvh)] divide-y divide-ink-100 overflow-y-auto">
              {items.map((item) => {
                const Icon = ICON_BY_TYPE[item.type] ?? Bell
                const unread = !item.readAt
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      data-unread={unread}
                      onClick={() => openNotification(item)}
                      className={cn(
                        'flex w-full items-start gap-3 px-4 py-3 text-left transition-colors focus-visible:bg-ink-50 focus-visible:outline-none',
                        unread ? 'bg-mint-50/70 hover:bg-mint-50' : 'hover:bg-ink-50',
                      )}
                    >
                      <span
                        className={cn(
                          'mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full',
                          unread ? 'bg-mint-200 text-ink-800' : 'bg-ink-100 text-ink-500',
                        )}
                      >
                        <Icon size={18} weight={unread ? 'fill' : 'regular'} aria-hidden="true" />
                      </span>
                      <span className="flex min-w-0 flex-1 flex-col gap-1">
                        <span className={cn('text-sm', unread ? 'font-medium text-ink-900' : 'text-ink-600')}>
                          {item.message}
                        </span>
                        <time dateTime={item.createdAt} className="text-xs text-ink-500">
                          {formatDateTime(item.createdAt)}
                        </time>
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
