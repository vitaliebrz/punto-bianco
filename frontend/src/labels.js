// Denumirile în română pentru valorile din baza de date
export const APARTMENT_LABELS = {
  STUDIO: 'Studio',
  UN_DORMITOR_DIVAN: '1 dormitor + divan',
  DOUA_DORMITOARE: '2 dormitoare',
  DOUA_DORMITOARE_LIVING: '2 dormitoare + living',
}

export const TRANSFER_DIRECTION_LABELS = {
  SOSIRE: 'Doar sosire',
  PLECARE: 'Doar plecare',
  DUS_INTORS: 'Dus-întors',
}

export const BACK_OFFICE_STATUS_LABELS = {
  NEPRELUAT: 'Nepreluat',
  INCEPUT: 'Început',
  FINALIZAT: 'Finalizat',
}

export const ACCOMMODATION_STATUS_LABELS = {
  NEPRELUCRAT: 'Neprelucrat',
  REZERVAT: 'Rezervat',
}

// Costul cazării: „Gratuită 3 zile” / „Gratuită 1 zi” / „Contra cost”
export const accommodationCostLabel = ({ isFree, freeDays }) =>
  isFree ? `Gratuită ${freeDays} ${freeDays === 1 ? 'zi' : 'zile'}` : 'Contra cost'

// Costul transferului: „Gratuit” / „Contra cost”
export const transferCostLabel = (isFree) => (isFree ? 'Gratuit' : 'Contra cost')

// Câte elemente are fiecare status: countByStatus(vizite, (v) => v.backOfficeStatus) -> { NEPRELUAT: 3, … }
export const countByStatus = (items, statusOf) =>
  items.reduce((counts, item) => ({ ...counts, [statusOf(item)]: (counts[statusOf(item)] ?? 0) + 1 }), {})

export const fullName = (person) => `${person.firstName} ${person.lastName}`

// "Anna Schmidt, Thomas Schmidt" (pacientul principal primul, așa vin de la server)
export const peopleNames = (patients) => patients.map(fullName).join(', ')
