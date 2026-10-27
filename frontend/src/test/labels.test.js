// Etichetele și numărarea comune paginilor (Back office, Cazări, Detalii vizită)
import { describe, expect, it } from 'vitest'
import { accommodationCostLabel, countByStatus, transferCostLabel } from '../labels'

describe('etichetele de cost', () => {
  it.each([
    [{ isFree: true, freeDays: 1 }, 'Gratuită 1 zi'],
    [{ isFree: true, freeDays: 3 }, 'Gratuită 3 zile'],
    [{ isFree: false, freeDays: null }, 'Contra cost'],
  ])('cazare %j -> %s', (accommodation, label) => {
    expect(accommodationCostLabel(accommodation)).toBe(label)
  })

  it('transfer', () => {
    expect(transferCostLabel(true)).toBe('Gratuit')
    expect(transferCostLabel(false)).toBe('Contra cost')
  })
})

describe('countByStatus', () => {
  it('numără câte elemente are fiecare status; statusurile lipsă nu apar', () => {
    const visits = [{ s: 'NEPRELUAT' }, { s: 'INCEPUT' }, { s: 'NEPRELUAT' }]
    expect(countByStatus(visits, (visit) => visit.s)).toEqual({ NEPRELUAT: 2, INCEPUT: 1 })
    expect(countByStatus([], (visit) => visit.s)).toEqual({})
  })
})
