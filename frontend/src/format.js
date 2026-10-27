// Datele vin de la server în UTC; le afișăm (și le citim din formular) în ora clinicii,
// oricare ar fi fusul orar al calculatorului sau telefonului.
export const CLINIC_TIME_ZONE = 'Europe/Chisinau'

const formatter = new Intl.DateTimeFormat('ro-RO', {
  timeZone: CLINIC_TIME_ZONE,
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

// Cu câte milisecunde e ora clinicii înaintea UTC în momentul dat (ex. +2 h iarna, +3 h vara)
function clinicOffsetMs(date) {
  const p = parts(date)
  const clinicWallClockAsUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute)
  const exactMinute = Math.floor(date.getTime() / 60000) * 60000
  return clinicWallClockAsUtc - exactMinute
}

// Valoarea unui câmp datetime-local („2026-11-02T14:30”), înțeleasă ca ORA CLINICII -> ISO în UTC.
// (new Date("2026-11-02T14:30") ar folosi fusul orar al calculatorului, care poate fi altul.)
// Valoare goală sau invalidă -> ''.
export function clinicLocalToIso(localValue) {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(localValue ?? '')
  if (!match) return ''
  const [, year, month, day, hour, minute] = match.map(Number)
  const wallClockAsUtc = Date.UTC(year, month - 1, day, hour, minute)
  // Primul calcul folosește diferența de oră din jurul momentului; al doilea o corectează
  // dacă momentul cade de cealaltă parte a schimbării orei de vară / iarnă.
  let instant = wallClockAsUtc - clinicOffsetMs(new Date(wallClockAsUtc))
  instant = wallClockAsUtc - clinicOffsetMs(new Date(instant))
  return new Date(instant).toISOString()
}

// Inversul: ISO în UTC -> „2026-11-02T14:30” în ora clinicii (pentru un câmp datetime-local)
export function isoToClinicLocal(iso) {
  if (!iso) return ''
  const p = parts(iso)
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`
}
