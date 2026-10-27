import { useCallback, useRef, useState } from 'react'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import listPlugin from '@fullcalendar/list'
import roLocale from '@fullcalendar/core/locales/ro'
import { apiFetch } from '../api'
import { useAuth } from '../auth/useAuth'
import { ErrorState } from '../components/PageState'
import { isReadOnly } from '../roles'
import { toCalendarEvent } from '../transferEvents'
import '../calendar.css'

// Pe telefon, vederea „listă” e mai ușor de citit decât grila săptămânii
const isNarrowScreen = () => window.matchMedia?.('(max-width: 720px)').matches ?? false

// Pasul 2 din cerință: șoferul vede transferurile în calendar (ca în Google Calendar)
export default function TransfersCalendarPage() {
  const { user } = useAuth()
  const [error, setError] = useState('')
  const calendarRef = useRef(null)

  // FullCalendar cere evenimentele pentru intervalul afișat (la fiecare schimbare de săptămână / lună)
  const loadEvents = useCallback((range, success, failure) => {
    const query = new URLSearchParams({
      from: range.start.toISOString(),
      to: range.end.toISOString(),
    })
    apiFetch(`/api/transfers?${query}`)
      .then((events) => {
        setError('')
        success(events.map(toCalendarEvent))
      })
      .catch((err) => {
        setError(err.message)
        failure(err)
      })
  }, [])

  const retry = () => calendarRef.current?.getApi().refetchEvents()

  return (
    <section className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-extrabold tracking-tight text-ink-800 sm:text-3xl">Calendar transferuri</h1>
          {isReadOnly(user.role) && <p className="text-sm text-ink-500">Doar vizualizare.</p>}
        </div>
        <ul aria-label="Legendă" className="flex items-center gap-4 text-sm text-ink-600">
          <li className="flex items-center gap-2">
            <span aria-hidden="true" className="size-3 rounded-[4px] border border-mint-400 bg-mint-300" />
            Sosire
          </li>
          <li className="flex items-center gap-2">
            <span aria-hidden="true" className="size-3 rounded-[4px] border border-ink-700 bg-ink-600" />
            Plecare
          </li>
        </ul>
      </div>

      {error && <ErrorState message={error} onRetry={retry} />}

      <div className="pb-calendar rounded-2xl bg-white p-3 shadow-card ring-1 ring-ink-200/60 sm:p-5">
        <FullCalendar
          ref={calendarRef}
          plugins={[timeGridPlugin, dayGridPlugin, listPlugin]}
          locale={roLocale}
          initialView={isNarrowScreen() ? 'listWeek' : 'timeGridWeek'}
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'timeGridDay,timeGridWeek,dayGridMonth,listWeek',
          }}
          events={loadEvents}
          // ora e deja în titlu („Sosire 14:30 – …”)
          displayEventTime={false}
          allDaySlot={false}
          slotDuration="01:00:00"
          scrollTime="06:00:00"
          nowIndicator
          height="auto"
          noEventsText="Nu sunt transferuri în această perioadă"
        />
      </div>
    </section>
  )
}
