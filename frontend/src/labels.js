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

export const fullName = (person) => `${person.firstName} ${person.lastName}`

// "Anna Schmidt, Thomas Schmidt" (pacientul principal primul, așa vin de la server)
export const peopleNames = (patients) => patients.map(fullName).join(', ')
