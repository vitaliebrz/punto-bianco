// Paginarea în browser: câte pagini, ce pagină e validă, ce elemente are fiecare pagină.
import { describe, expect, it } from 'vitest'
import { clampPage, PAGE_SIZE, pageCount, pageItems } from '../pagination'

const items = Array.from({ length: 23 }, (_, index) => index + 1)

describe('pageCount', () => {
  it.each([
    [0, 1],
    [1, 1],
    [10, 1],
    [11, 2],
    [23, 3],
  ])('%i elemente -> %i pagini', (total, pages) => {
    expect(pageCount(total)).toBe(pages)
  })
})

describe('clampPage', () => {
  it.each([
    [null, 1],
    ['', 1],
    ['abc', 1],
    ['0', 1],
    ['-2', 1],
    ['2', 2],
    ['3', 3],
    ['99', 3],
  ])('?pagina=%s cu 23 de elemente -> pagina %i', (value, page) => {
    expect(clampPage(value, 23)).toBe(page)
  })

  it('lista goală are o singură pagină', () => {
    expect(clampPage('5', 0)).toBe(1)
  })
})

describe('pageItems', () => {
  it(`prima pagină: primele ${PAGE_SIZE}, în ordinea listei`, () => {
    expect(pageItems(items, 1)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
  })

  it('ultima pagină poate fi incompletă', () => {
    expect(pageItems(items, 3)).toEqual([21, 22, 23])
  })
})
