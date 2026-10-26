import { describe, expect, it } from 'vitest';
import { formatDateTime, formatShortDate } from '../src/lib/format.js';
import { buildVisitNotifications } from '../src/services/notifications.js';

const recipients = [
  { id: 4, role: 'BACK_OFFICE' },
  { id: 5, role: 'MANAGER_CAZARI' },
  { id: 10, role: 'BACK_OFFICE' },
];

const visit = {
  id: 7,
  // 28.10.2026: după trecerea la ora de iarnă, Chișinău = UTC+2
  arrivalAt: new Date('2026-10-28T12:30:00.000Z'),
  departureAt: new Date('2026-11-02T08:00:00.000Z'),
  patients: [{ firstName: 'Marco', lastName: 'Rossi', isCompanion: false }],
  accommodation: { apartmentType: 'STUDIO', isFree: false, freeDays: null },
};

describe('formatarea datelor (ora Chișinăului)', () => {
  it('iarna: UTC+2', () => {
    expect(formatDateTime(new Date('2026-10-28T12:30:00.000Z'))).toBe('28.10.2026 14:30');
  });

  it('vara: UTC+3', () => {
    expect(formatDateTime(new Date('2026-07-01T07:05:00.000Z'))).toBe('01.07.2026 10:05');
  });

  it('miezul nopții se scrie 00:xx, iar ziua e cea locală', () => {
    expect(formatDateTime(new Date('2026-12-31T22:15:00.000Z'))).toBe('01.01.2027 00:15');
    expect(formatShortDate(new Date('2026-12-31T22:15:00.000Z'))).toBe('01.01');
  });
});

describe('buildVisitNotifications', () => {
  it('Back office: câte o notificare pentru fiecare utilizator', () => {
    const rows = buildVisitNotifications(visit, recipients).filter(
      (row) => row.type === 'VIZITA_NOUA_BACK_OFFICE',
    );
    expect(rows.map((row) => row.userId)).toEqual([4, 10]);
    expect(rows[0]).toEqual({
      userId: 4,
      visitId: 7,
      type: 'VIZITA_NOUA_BACK_OFFICE',
      message: 'Vizită nouă: Marco Rossi, sosire 28.10.2026 14:30',
    });
  });

  it('Manager cazări: notificare cu tipul apartamentului și perioada', () => {
    const rows = buildVisitNotifications(visit, recipients).filter(
      (row) => row.type === 'CAZARE_NOUA',
    );
    expect(rows).toEqual([
      {
        userId: 5,
        visitId: 7,
        type: 'CAZARE_NOUA',
        message: 'Cerere de cazare: Marco Rossi – Studio, 28.10–02.11',
      },
    ]);
  });

  it('cazare gratuită: apar și zilele', () => {
    const rows = buildVisitNotifications(
      { ...visit, accommodation: { apartmentType: 'DOUA_DORMITOARE', isFree: true, freeDays: 3 } },
      recipients,
    );
    expect(rows.find((row) => row.type === 'CAZARE_NOUA').message).toBe(
      'Cerere de cazare: Marco Rossi – 2 dormitoare, gratuită 3 zile, 28.10–02.11',
    );
  });

  it('o singură zi gratuită: „1 zi”', () => {
    const rows = buildVisitNotifications(
      { ...visit, accommodation: { apartmentType: 'STUDIO', isFree: true, freeDays: 1 } },
      recipients,
    );
    expect(rows.find((row) => row.type === 'CAZARE_NOUA').message).toContain('gratuită 1 zi,');
  });

  it('fără cazare: Managerul de cazări nu primește nimic', () => {
    const rows = buildVisitNotifications({ ...visit, accommodation: null }, recipients);
    expect(rows.map((row) => row.type)).toEqual([
      'VIZITA_NOUA_BACK_OFFICE',
      'VIZITA_NOUA_BACK_OFFICE',
    ]);
  });

  it('cu însoțitor: pacientul principal + „(+ însoțitor)”', () => {
    const rows = buildVisitNotifications(
      {
        ...visit,
        patients: [
          { firstName: 'Anna', lastName: 'Rossi', isCompanion: true },
          { firstName: 'Marco', lastName: 'Rossi', isCompanion: false },
        ],
      },
      recipients,
    );
    expect(rows[0].message).toBe('Vizită nouă: Marco Rossi (+ însoțitor), sosire 28.10.2026 14:30');
  });

  it('alte roluri (ex. Șofer) nu primesc notificări', () => {
    expect(buildVisitNotifications(visit, [{ id: 6, role: 'SOFER' }])).toEqual([]);
  });

  it('fără destinatari: nicio notificare', () => {
    expect(buildVisitNotifications(visit, [])).toEqual([]);
  });
});
