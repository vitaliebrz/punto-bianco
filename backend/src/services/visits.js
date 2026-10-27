// Ce se încarcă împreună cu o vizită (liste, detalii, răspunsul la creare).
export const visitInclude = {
  // pacientul principal primul, apoi însoțitorul
  patients: {
    orderBy: [{ isCompanion: 'asc' }, { id: 'asc' }],
    include: { treatment: { select: { description: true } } },
  },
  accommodation: true,
  transfer: true,
  coordinator: { select: { id: true, fullName: true } },
};

// O persoană din formular -> date pentru create imbricat (cu tratamentul, dacă are).
export function personCreateData(person, isCompanion) {
  return {
    firstName: person.firstName,
    lastName: person.lastName,
    isCompanion,
    availability: person.availability,
    ...(person.treatment && { treatment: { create: { description: person.treatment } } }),
  };
}

// Forma trimisă clientului: tratamentul ca text simplu, fără câmpuri interne.
// medical: false -> persoanele vin fără tratament și disponibilitate (pentru cine nu are nevoie de ele).
export function serializeVisit(visit, { medical = true } = {}) {
  return {
    id: visit.id,
    arrivalAt: visit.arrivalAt,
    departureAt: visit.departureAt,
    hasCompanion: visit.hasCompanion,
    coordinator: visit.coordinator,
    backOfficeStatus: visit.backOfficeStatus,
    backOfficeStartedAt: visit.backOfficeStartedAt,
    backOfficeFinishedAt: visit.backOfficeFinishedAt,
    externalId: visit.externalId,
    createdAt: visit.createdAt,
    patients: visit.patients.map((person) => ({
      id: person.id,
      firstName: person.firstName,
      lastName: person.lastName,
      isCompanion: person.isCompanion,
      ...(medical && {
        availability: person.availability,
        treatment: person.treatment?.description ?? null,
      }),
    })),
    accommodation: visit.accommodation && {
      id: visit.accommodation.id,
      apartmentType: visit.accommodation.apartmentType,
      isFree: visit.accommodation.isFree,
      freeDays: visit.accommodation.freeDays,
      status: visit.accommodation.status,
      reservedAt: visit.accommodation.reservedAt,
    },
    transfer: visit.transfer && {
      isFree: visit.transfer.isFree,
      direction: visit.transfer.direction,
    },
  };
}
