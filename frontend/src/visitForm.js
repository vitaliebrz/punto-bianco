// Starea formularului „Vizită nouă” și transformarea ei în corpul cererii POST /api/visits.

export function initialVisitForm(user) {
  return {
    patient: { firstName: '', lastName: '', treatment: '', availability: '' },
    hasCompanion: false,
    companion: { firstName: '', lastName: '', treatment: '', availability: '' },
    companionHasTreatment: false,
    arrivalAt: '',
    departureAt: '',
    needsAccommodation: false,
    accommodation: { apartmentType: '', isFree: false, freeDays: '' },
    needsTransfer: false,
    transfer: { isFree: false, direction: '' },
    // coordonatorul conectat e preselectat
    coordinatorId: user.role === 'COORDONATOR' ? String(user.id) : '',
  }
}

// "2026-11-02T14:30" (ora locală din câmpul datetime-local) -> ISO în UTC
function toIso(localValue) {
  if (!localValue) return ''
  const date = new Date(localValue)
  return Number.isNaN(date.getTime()) ? '' : date.toISOString()
}

// Trimite doar ce a ales coordonatorul: secțiunile nebifate devin null („nu e nevoie”).
export function buildVisitPayload(form) {
  return {
    patient: { ...form.patient },
    companion: form.hasCompanion
      ? {
          firstName: form.companion.firstName,
          lastName: form.companion.lastName,
          ...(form.companionHasTreatment && {
            treatment: form.companion.treatment,
            availability: form.companion.availability,
          }),
        }
      : null,
    arrivalAt: toIso(form.arrivalAt),
    departureAt: toIso(form.departureAt),
    coordinatorId: form.coordinatorId ? Number(form.coordinatorId) : null,
    accommodation: form.needsAccommodation
      ? {
          apartmentType: form.accommodation.apartmentType,
          isFree: form.accommodation.isFree,
          ...(form.accommodation.isFree && {
            freeDays: form.accommodation.freeDays === '' ? null : Number(form.accommodation.freeDays),
          }),
        }
      : null,
    transfer: form.needsTransfer
      ? { isFree: form.transfer.isFree, direction: form.transfer.direction }
      : null,
  }
}

// Erorile de la server ({ field: 'patient.firstName', message }) -> { 'patient.firstName': message }
export function errorsByField(details = []) {
  const errors = {}
  for (const { field, message } of details) {
    if (!errors[field]) errors[field] = message
  }
  return errors
}
