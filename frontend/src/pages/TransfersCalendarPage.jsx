import { useCallback, useState } from 'react'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import listPlugin from '@fullcalendar/list'
import roLocale from '@fullcalendar/core/locales/ro'
import { apiFetch } from '../api'
import { useAuth } from '../auth/useAuth'
import { isReadOnly } from '../roles'
import { toCalendarEvent } from '../transferEvents'

// Pe telefon, vederea „listă” e mai ușor de citit decât grila săptămânii
const isNarrowScreen = () => window.matchMedia?.('(max-width: 720px)').matches ?? false

// Pasul 2 din cerință: șoferul vede transferurile în calendar (ca în Google Calendar)
export default function TransfersCalendarPage() {
  const { user } = useAuth()
  const [error, setError] = useState('')

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

  return (
    <section className="page">
      <div className="page-header">
        <h1>Calendar transferuri</h1>
        <div className="legend" aria-label="Legendă">
          <span className="legend-item transfer-sosire">Sosire</span>
          <span className="legend-item transfer-plecare">Plecare</span>
        </div>
      </div>
      {isReadOnly(user.role) && <p className="readonly-note">Doar vizualizare.</p>}

      {error && (
        <p className="alert-error" role="alert">
          {error}
        </p>
      )}

      <div className="calendar">
        <FullCalendar
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
