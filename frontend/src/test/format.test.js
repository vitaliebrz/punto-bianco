// Ora clinicii (Europe/Chisinau): afișare și citirea orei din formular, oricare ar fi fusul orar al calculatorului.
import { describe, expect, it } from 'vitest'
import { clinicLocalToIso, formatDateTime } from '../format'

describe('clinicLocalToIso: ora din formular e ora clinicii', () => {
  it.each([
    ['iarna (UTC+2)', '2026-11-02T14:30', '2026-11-02T12:30:00.000Z'],
    ['vara (UTC+3)', '2026-07-10T10:00', '2026-07-10T07:00:00.000Z'],
    ['miezul nopții, ziua locală', '2027-01-01T00:15', '2026-12-31T22:15:00.000Z'],
    ['ultima zi cu ora de vară (25.10.2026, ora 3:00 -> 2:00)', '2026-10-24T23:00', '2026-10-24T20:00:00.000Z'],
    ['prima zi cu ora de iarnă', '2026-10-25T12:00', '2026-10-25T10:00:00.000Z'],
    ['trecerea la ora de vară (29.03.2026)', '2026-03-29T12:00', '2026-03-29T09:00:00.000Z'],
  ])('%s: %s -> %s', (_name, local, iso) => {
    expect(clinicLocalToIso(local)).toBe(iso)
  })

  it('valoare goală sau invalidă -> ""', () => {
    expect(clinicLocalToIso('')).toBe('')
    expect(clinicLocalToIso(undefined)).toBe('')
    expect(clinicLocalToIso('mâine')).toBe('')
  })

  it.each(['2026-13-01T10:00', '2026-02-30T10:00', '2026-11-02T24:00', '2026-11-02T14:60', '2026-13-45T99:99'])(
    'dată sau oră imposibilă %s -> "" (nu se mută în altă zi)',
    (local) => {
      expect(clinicLocalToIso(local)).toBe('')
    },
  )

  it('ora salvată se afișează exact cum a fost introdusă (și în jurul schimbării orei)', () => {
    for (const local of ['2026-11-02T14:30', '2026-07-10T10:00', '2026-03-29T04:30', '2026-10-25T05:00']) {
      const iso = clinicLocalToIso(local)
      const [date, time] = local.split('T')
      const [year, month, day] = date.split('-')
      expect(formatDateTime(iso)).toBe(`${day}.${month}.${year} ${time}`)
    }
  })

  // Rezultatele de mai sus nu depind de fusul orar al calculatorului: funcția nu folosește
  // new Date("…T14:30") (ora locală). Verificat rulând testele cu TZ=America/New_York, Asia/Tokyo și UTC.
})
