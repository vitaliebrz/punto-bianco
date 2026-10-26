import { formatDateTime, formatShortDate } from '../lib/format.js';

// Rolurile care primesc notificări la o vizită nouă (Pasul 2 din cerință).
// Șoferul nu primește notificare: vede transferul în calendar.
export const NOTIFIED_ROLES = ['BACK_OFFICE', 'MANAGER_CAZARI'];

export const APARTMENT_LABELS = {
  STUDIO: 'Studio',
  UN_DORMITOR_DIVAN: '1 dormitor + divan',
  DOUA_DORMITOARE: '2 dormitoare',
  DOUA_DORMITOARE_LIVING: '2 dormitoare + living',
};

// "Marco Rossi" sau "Marco Rossi (+ însoțitor)"
function patientLabel(patients) {
  const main = patients.find((person) => !person.isCompanion) ?? patients[0];
  const name = `${main.firstName} ${main.lastName}`;
  return patients.length > 1 ? `${name} (+ însoțitor)` : name;
}

// Construiește rândurile Notification pentru o vizită nouă.
// visit: vizita creată, cu patients și accommodation (null = fără cazare)
// recipients: utilizatorii activi cu rolurile din NOTIFIED_ROLES ({ id, role })
export function buildVisitNotifications(visit, recipients) {
  const who = patientLabel(visit.patients);
  const notifications = [];

  for (const user of recipients) {
    if (user.role === 'BACK_OFFICE') {
      notifications.push({
        userId: user.id,
        visitId: visit.id,
        type: 'VIZITA_NOUA_BACK_OFFICE',
        message: `Vizită nouă: ${who}, sosire ${formatDateTime(visit.arrivalAt)}`,
      });
    }

    if (user.role === 'MANAGER_CAZARI' && visit.accommodation) {
      const { apartmentType, isFree, freeDays } = visit.accommodation;
      const price = isFree ? `, gratuită ${freeDays} ${freeDays === 1 ? 'zi' : 'zile'}` : '';
      notifications.push({
        userId: user.id,
        visitId: visit.id,
        type: 'CAZARE_NOUA',
        message:
          `Cerere de cazare: ${who} – ${APARTMENT_LABELS[apartmentType]}${price}, ` +
          `${formatShortDate(visit.arrivalAt)}–${formatShortDate(visit.departureAt)}`,
      });
    }
  }

  return notifications;
}
