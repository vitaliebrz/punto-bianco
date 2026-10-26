import { formatTime } from './format'

const KIND_LABELS = { SOSIRE: 'Sosire', PLECARE: 'Plecare' }

// Textul din calendar, exact ca în cerință: „Sosire 14:30 – Nume pacient(i)”
export function transferEventTitle(event) {
  return `${KIND_LABELS[event.kind]} ${formatTime(event.at)} – ${event.names.join(', ')}`
}

// Evenimentul de la API (/api/transfers) -> evenimentul FullCalendar
export function toCalendarEvent(event) {
  return {
    id: event.id,
    title: transferEventTitle(event),
    start: event.at,
    allDay: false,
    classNames: [`transfer-${event.kind.toLowerCase()}`],
    extendedProps: { visitId: event.visitId, isFree: event.isFree },
  }
}
