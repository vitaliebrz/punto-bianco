// Formatarea datelor pentru textele trimise utilizatorilor (ex. notificări).
// În baza de date orele sunt în UTC; echipa lucrează în ora clinicii.
export const CLINIC_TIME_ZONE = 'Europe/Chisinau';

const formatter = new Intl.DateTimeFormat('ro-RO', {
  timeZone: CLINIC_TIME_ZONE,
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

function parts(date) {
  return Object.fromEntries(
    formatter.formatToParts(date).map((part) => [part.type, part.value]),
  );
}

// "28.10.2026 14:30"
export function formatDateTime(date) {
  const p = parts(date);
  return `${p.day}.${p.month}.${p.year} ${p.hour}:${p.minute}`;
}

// "28.10"
export function formatShortDate(date) {
  const p = parts(date);
  return `${p.day}.${p.month}`;
}
