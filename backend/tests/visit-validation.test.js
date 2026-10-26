import { describe, expect, it } from 'vitest';
import {
  accommodationStatusSchema,
  backOfficeStatusSchema,
  createVisitSchema,
} from '../src/schemas/visit.js';
import { transfersRangeSchema } from '../src/schemas/transfer.js';

const valid = {
  patient: {
    firstName: 'Marco',
    lastName: 'Rossi',
    treatment: 'Implant dentar',
    availability: 'Liber după ora 12:00',
  },
  companion: null,
  arrivalAt: '2026-11-02T12:30:00.000Z',
  departureAt: '2026-11-09T08:00:00.000Z',
  coordinatorId: 2,
  accommodation: { apartmentType: 'STUDIO', isFree: true, freeDays: 3 },
  transfer: { isFree: false, direction: 'DUS_INTORS' },
};

function errorsOf(body) {
  const result = createVisitSchema.safeParse(body);
  expect(result.success).toBe(false);
  return result.error.issues.map((issue) => issue.path.join('.'));
}

describe('createVisitSchema', () => {
  it('acceptă un formular complet', () => {
    const result = createVisitSchema.parse(valid);
    expect(result.arrivalAt).toBeInstanceOf(Date);
    expect(result.arrivalAt.toISOString()).toBe(valid.arrivalAt);
    expect(result.accommodation).toEqual(valid.accommodation);
  });

  it('acceptă formularul minim: fără însoțitor, cazare, transfer, disponibilitate', () => {
    const result = createVisitSchema.parse({
      patient: { firstName: 'Marco', lastName: 'Rossi', treatment: 'Control' },
      arrivalAt: valid.arrivalAt,
      departureAt: valid.departureAt,
      coordinatorId: 2,
    });
    expect(result.companion).toBeNull();
    expect(result.accommodation).toBeNull();
    expect(result.transfer).toBeNull();
    expect(result.patient.availability).toBeNull();
  });

  it('curăță textele: spații la capete, text gol devine null', () => {
    const result = createVisitSchema.parse({
      ...valid,
      patient: { firstName: '  Marco ', lastName: 'Rossi', treatment: ' Implant ', availability: '   ' },
    });
    expect(result.patient).toEqual({
      firstName: 'Marco',
      lastName: 'Rossi',
      treatment: 'Implant',
      availability: null,
    });
  });

  it('acceptă ora cu fus orar (+02:00)', () => {
    const result = createVisitSchema.parse({
      ...valid,
      arrivalAt: '2026-11-02T14:30:00+02:00',
    });
    expect(result.arrivalAt.toISOString()).toBe('2026-11-02T12:30:00.000Z');
  });

  describe('însoțitor', () => {
    it('fără tratament: doar numele', () => {
      const result = createVisitSchema.parse({
        ...valid,
        companion: { firstName: 'Anna', lastName: 'Rossi' },
      });
      expect(result.companion).toEqual({
        firstName: 'Anna',
        lastName: 'Rossi',
        treatment: null,
        availability: null,
      });
    });

    it('cu tratament și disponibilitate', () => {
      const companion = {
        firstName: 'Anna',
        lastName: 'Rossi',
        treatment: 'Albire',
        availability: 'Dimineața',
      };
      expect(createVisitSchema.parse({ ...valid, companion }).companion).toEqual(companion);
    });

    it('respinge disponibilitatea fără tratament', () => {
      expect(
        errorsOf({
          ...valid,
          companion: { firstName: 'Anna', lastName: 'Rossi', availability: 'Dimineața' },
        }),
      ).toEqual(['companion.availability']);
    });

    it('respinge însoțitorul fără nume', () => {
      expect(errorsOf({ ...valid, companion: { firstName: 'Anna' } })).toEqual([
        'companion.lastName',
      ]);
    });
  });

  describe('sejur', () => {
    it('respinge plecarea înainte de sosire sau în același moment', () => {
      expect(errorsOf({ ...valid, departureAt: '2026-11-01T08:00:00.000Z' })).toEqual([
        'departureAt',
      ]);
      expect(errorsOf({ ...valid, departureAt: valid.arrivalAt })).toEqual(['departureAt']);
    });

    it.each([
      ['dată fără oră', '2026-11-02'],
      ['oră fără fus orar', '2026-11-02T12:30:00'],
      ['text', 'mâine'],
      ['număr', 1730550600000],
    ])('respinge sosirea: %s', (_name, arrivalAt) => {
      expect(errorsOf({ ...valid, arrivalAt })).toContain('arrivalAt');
    });
  });

  describe('cazare', () => {
    it('contra cost, fără zile gratuite', () => {
      const accommodation = { apartmentType: 'DOUA_DORMITOARE_LIVING', isFree: false };
      expect(createVisitSchema.parse({ ...valid, accommodation }).accommodation).toEqual({
        ...accommodation,
        freeDays: null,
      });
    });

    it('respinge gratuită fără număr de zile', () => {
      expect(
        errorsOf({ ...valid, accommodation: { apartmentType: 'STUDIO', isFree: true } }),
      ).toEqual(['accommodation.freeDays']);
    });

    it('respinge zile gratuite la cazare contra cost', () => {
      expect(
        errorsOf({
          ...valid,
          accommodation: { apartmentType: 'STUDIO', isFree: false, freeDays: 2 },
        }),
      ).toEqual(['accommodation.freeDays']);
    });

    it.each([
      ['tip inexistent', { apartmentType: 'VILA', isFree: false }],
      ['zile 0', { apartmentType: 'STUDIO', isFree: true, freeDays: 0 }],
      ['zile cu virgulă', { apartmentType: 'STUDIO', isFree: true, freeDays: 1.5 }],
      ['zile ca text', { apartmentType: 'STUDIO', isFree: true, freeDays: '3' }],
      ['gratuit ca text', { apartmentType: 'STUDIO', isFree: 'da', freeDays: 3 }],
      ['status trimis de client', { apartmentType: 'STUDIO', isFree: false, status: 'REZERVAT' }],
    ])('respinge: %s', (_name, accommodation) => {
      expect(createVisitSchema.safeParse({ ...valid, accommodation }).success).toBe(false);
    });
  });

  describe('transfer', () => {
    it.each(['SOSIRE', 'PLECARE', 'DUS_INTORS'])('acceptă direcția %s', (direction) => {
      const transfer = { isFree: true, direction };
      expect(createVisitSchema.parse({ ...valid, transfer }).transfer).toEqual(transfer);
    });

    it.each([
      ['direcție inexistentă', { isFree: true, direction: 'TUR' }],
      ['fără direcție', { isFree: true }],
      ['fără gratuit/contra cost', { direction: 'SOSIRE' }],
    ])('respinge: %s', (_name, transfer) => {
      expect(createVisitSchema.safeParse({ ...valid, transfer }).success).toBe(false);
    });
  });

  it.each([
    ['câmp în plus: createdById', { ...valid, createdById: 1 }],
    ['câmp în plus: backOfficeStatus', { ...valid, backOfficeStatus: 'FINALIZAT' }],
    ['câmp în plus: externalId', { ...valid, externalId: 'B24-1' }],
    ['câmp în plus la pacient', { ...valid, patient: { ...valid.patient, isCompanion: true } }],
    ['pacient fără tratament', { ...valid, patient: { firstName: 'Marco', lastName: 'Rossi' } }],
    ['tratament gol', { ...valid, patient: { ...valid.patient, treatment: '   ' } }],
    ['nume prea lung', { ...valid, patient: { ...valid.patient, firstName: 'a'.repeat(101) } }],
    ['tratament prea lung', { ...valid, patient: { ...valid.patient, treatment: 'a'.repeat(2001) } }],
    ['nume ca obiect', { ...valid, patient: { ...valid.patient, lastName: { contains: 'R' } } }],
    ['coordonator ca text', { ...valid, coordinatorId: '2' }],
    ['coordonator negativ', { ...valid, coordinatorId: -1 }],
    ['coordonator lipsă', { ...valid, coordinatorId: undefined }],
    ['pacient lipsă', { ...valid, patient: undefined }],
    ['obiect gol', {}],
    ['null', null],
  ])('respinge: %s', (_name, body) => {
    expect(createVisitSchema.safeParse(body).success).toBe(false);
  });
});

describe('transfersRangeSchema (intervalul calendarului)', () => {
  const from = '2026-11-02T00:00:00.000Z';

  it('acceptă o săptămână și transformă în Date', () => {
    const result = transfersRangeSchema.parse({ from, to: '2026-11-09T00:00:00.000Z' });
    expect(result.from).toBeInstanceOf(Date);
  });

  it.each([
    ['fără interval', {}],
    ['sfârșit înainte de început', { from, to: '2026-11-01T00:00:00.000Z' }],
    ['peste 62 de zile', { from, to: '2027-01-04T00:00:00.000Z' }],
    ['dată invalidă', { from: 'ieri', to: '2026-11-09T00:00:00.000Z' }],
    ['parametru repetat (listă)', { from: [from, from], to: '2026-11-09T00:00:00.000Z' }],
    ['parametru în plus', { from, to: '2026-11-09T00:00:00.000Z', userId: '1' }],
  ])('respinge: %s', (_name, query) => {
    expect(transfersRangeSchema.safeParse(query).success).toBe(false);
  });
});

describe('schemele de status', () => {
  it('Back office: doar INCEPUT sau FINALIZAT', () => {
    expect(backOfficeStatusSchema.safeParse({ status: 'INCEPUT' }).success).toBe(true);
    expect(backOfficeStatusSchema.safeParse({ status: 'FINALIZAT' }).success).toBe(true);
    expect(backOfficeStatusSchema.safeParse({ status: 'NEPRELUAT' }).success).toBe(false);
    expect(backOfficeStatusSchema.safeParse({ status: 'INCEPUT', at: 'x' }).success).toBe(false);
  });

  it('Cazare: doar REZERVAT', () => {
    expect(accommodationStatusSchema.safeParse({ status: 'REZERVAT' }).success).toBe(true);
    expect(accommodationStatusSchema.safeParse({ status: 'NEPRELUCRAT' }).success).toBe(false);
    expect(accommodationStatusSchema.safeParse({}).success).toBe(false);
  });
});
