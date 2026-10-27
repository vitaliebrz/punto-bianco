// Forma vizitei trimisă clientului; varianta fără date medicale e pentru Managerul de cazări.
import { describe, expect, it } from 'vitest';
import { serializeVisit } from '../src/services/visits.js';

const visit = {
  id: 7,
  arrivalAt: new Date('2026-11-02T12:30:00.000Z'),
  departureAt: new Date('2026-11-06T08:00:00.000Z'),
  hasCompanion: true,
  coordinator: { id: 2, fullName: 'Ana Ciobanu' },
  backOfficeStatus: 'NEPRELUAT',
  backOfficeStartedAt: null,
  backOfficeFinishedAt: null,
  externalId: null,
  createdAt: new Date('2026-10-27T09:00:00.000Z'),
  patients: [
    {
      id: 1,
      firstName: 'Marco',
      lastName: 'Rossi',
      isCompanion: false,
      availability: 'După ora 12:00',
      treatment: { description: 'Implant' },
    },
    { id: 2, firstName: 'Giulia', lastName: 'Rossi', isCompanion: true, availability: null, treatment: null },
  ],
  accommodation: {
    id: 3,
    visitId: 7,
    apartmentType: 'STUDIO',
    isFree: true,
    freeDays: 3,
    status: 'NEPRELUCRAT',
    reservedAt: null,
  },
  transfer: null,
};

describe('serializeVisit', () => {
  it('implicit: tratamentul ca text și disponibilitatea', () => {
    const result = serializeVisit(visit);
    expect(result.patients).toEqual([
      { id: 1, firstName: 'Marco', lastName: 'Rossi', isCompanion: false, availability: 'După ora 12:00', treatment: 'Implant' },
      { id: 2, firstName: 'Giulia', lastName: 'Rossi', isCompanion: true, availability: null, treatment: null },
    ]);
    expect(result.accommodation).not.toHaveProperty('visitId');
  });

  it('medical: false -> fără tratament și disponibilitate, restul neschimbat', () => {
    const result = serializeVisit(visit, { medical: false });
    expect(result.patients).toEqual([
      { id: 1, firstName: 'Marco', lastName: 'Rossi', isCompanion: false },
      { id: 2, firstName: 'Giulia', lastName: 'Rossi', isCompanion: true },
    ]);
    expect(result.accommodation).toEqual(serializeVisit(visit).accommodation);
    expect(result.arrivalAt).toEqual(visit.arrivalAt);
  });
});
