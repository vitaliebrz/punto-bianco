// Datele vin de la server în UTC; le afișăm în ora clinicii.
const TIME_ZONE = 'Europe/Chisinau'

const formatter = new Intl.DateTimeFormat('ro-RO', {
  timeZone: TIME_ZONE,
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})

function parts(value) {
  return Object.fromEntries(
    formatter.formatToParts(new Date(value)).map((part) => [part.type, part.value]),
  )
}

// "28.10.2026 14:30"
export function formatDateTime(value) {
  const p = parts(value)
  return `${p.day}.${p.month}.${p.year} ${p.hour}:${p.minute}`
}

// "28.10.2026"
export function formatDate(value) {
  const p = parts(value)
  return `${p.day}.${p.month}.${p.year}`
}

// "14:30"
export function formatTime(value) {
  const p = parts(value)
  return `${p.hour}:${p.minute}`
}
