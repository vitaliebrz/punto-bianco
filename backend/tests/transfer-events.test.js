import { describe, expect, it } from 'vitest';
import { toTransferEvents } from '../src/services/transferEvents.js';

const from = new Date('2026-11-02T00:00:00.000Z');
const to = new Date('2026-11-09T00:00:00.000Z');

function visit(id, direction, arrivalAt, departureAt, extra = {}) {
  return {
    id,
    arrivalAt: new Date(arrivalAt),
    departureAt: new Date(departureAt),
    patients: [{ firstName: 'Marco', lastName: 'Rossi', isCompanion: false }],
    transfer: direction ? { direction, isFree: true } : null,
    ...extra,
  };
}

describe('toTransferEvents', () => {
  it('SOSIRE: un singur eveniment, la ora sosirii', () => {
    const events = toTransferEvents(
      [visit(1, 'SOSIRE', '2026-11-03T12:30:00Z', '2026-11-06T08:00:00Z')],
      from,
      to,
    );
    expect(events).toEqual([
      {
        id: '1-SOSIRE',
        visitId: 1,
        kind: 'SOSIRE',
        at: new Date('2026-11-03T12:30:00Z'),
        names: ['Marco Rossi'],
        isFree: true,
      },
    ]);
  });

  it('PLECARE: un singur eveniment, la ora plecării', () => {
    const events = toTransferEvents(
      [visit(1, 'PLECARE', '2026-11-03T12:30:00Z', '2026-11-06T08:00:00Z')],
      from,
      to,
    );
    expect(events.map((e) => [e.kind, e.at.toISOString()])).toEqual([
      ['PLECARE', '2026-11-06T08:00:00.000Z'],
    ]);
  });

  it('DUS_INTORS: două evenimente', () => {
    const events = toTransferEvents(
      [visit(1, 'DUS_INTORS', '2026-11-03T12:30:00Z', '2026-11-06T08:00:00Z')],
      from,
      to,
    );
    expect(events.map((e) => e.id)).toEqual(['1-SOSIRE', '1-PLECARE']);
  });

  it('vizitele fără transfer nu apar', () => {
    expect(
      toTransferEvents([visit(1, null, '2026-11-03T12:30:00Z', '2026-11-06T08:00:00Z')], from, to),
    ).toEqual([]);
  });

  it('doar evenimentele din interval (început inclus, sfârșit exclus)', () => {
    const events = toTransferEvents(
      [
        // sosirea înainte de interval, plecarea în interval
        visit(1, 'DUS_INTORS', '2026-10-30T10:00:00Z', '2026-11-04T08:00:00Z'),
        // sosirea exact la început (inclus), plecarea exact la sfârșit (exclus)
        visit(2, 'DUS_INTORS', '2026-11-02T00:00:00Z', '2026-11-09T00:00:00Z'),
      ],
      from,
      to,
    );
    expect(events.map((e) => e.id)).toEqual(['2-SOSIRE', '1-PLECARE']);
  });

  it('ordonate după oră, pacientul principal primul în listă', () => {
    const events = toTransferEvents(
      [
        visit(1, 'SOSIRE', '2026-11-05T09:00:00Z', '2026-11-08T08:00:00Z'),
        visit(2, 'SOSIRE', '2026-11-04T15:00:00Z', '2026-11-07T08:00:00Z', {
          patients: [
            { firstName: 'Thomas', lastName: 'Schmidt', isCompanion: true },
            { firstName: 'Anna', lastName: 'Schmidt', isCompanion: false },
          ],
        }),
      ],
      from,
      to,
    );
    expect(events.map((e) => e.visitId)).toEqual([2, 1]);
    expect(events[0].names).toEqual(['Anna Schmidt', 'Thomas Schmidt']);
  });
});
