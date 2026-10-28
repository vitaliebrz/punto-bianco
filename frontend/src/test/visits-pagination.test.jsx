// Pagina „Vizite” cu mai mult de 10 vizite: câte 10 pe pagină, „Înapoi” / „Înainte”, ordinea serverului.
import { describe, expect, it } from 'vitest'
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { json, renderAs, USERS, VISIT } from './helpers'

// Vizitele 1..count, în ordinea în care le trimite serverul (după data sosirii)
function visits(count) {
  return Array.from({ length: count }, (_, index) => {
    const number = String(index + 1).padStart(2, '0')
    return {
      ...VISIT,
      id: index + 1,
      patients: [{ ...VISIT.patients[0], id: index + 1, firstName: `Pacient${number}`, lastName: 'Test' }],
    }
  })
}

// Numele din rândurile afișate, în ordine
async function shownNames() {
  const links = await screen.findAllByRole('link', { name: /^Pacient\d+ Test$/ })
  return links.map((link) => link.textContent.replace(' Test', ''))
}

const names = (from, to) =>
  Array.from({ length: to - from + 1 }, (_, index) => `Pacient${String(from + index).padStart(2, '0')}`)

function openVisits(path, count) {
  renderAs(USERS.coordonator, path, { 'GET /api/visits': json(200, visits(count)) })
}

describe('Paginarea vizitelor', () => {
  it('prima pagină arată vizitele 1–10, iar „Înapoi” e blocat', async () => {
    openVisits('/vizite', 23)

    expect(await shownNames()).toEqual(names(1, 10))
    const pagination = screen.getByRole('navigation', { name: 'Paginare' })
    expect(within(pagination).getByText(/Pagina/)).toHaveTextContent('Pagina 1 din 3')
    expect(within(pagination).getByRole('button', { name: 'Înapoi' })).toBeDisabled()
    expect(within(pagination).getByRole('button', { name: 'Înainte' })).toBeEnabled()
    expect(screen.getByText('23 de vizite, în ordinea datei de sosire.')).toBeInTheDocument()
  })

  it('„Înainte” și „Înapoi” trec prin pagini, păstrând ordinea', async () => {
    const user = userEvent.setup()
    openVisits('/vizite', 23)
    await shownNames()

    await user.click(screen.getByRole('button', { name: 'Înainte' }))
    expect(await shownNames()).toEqual(names(11, 20))

    await user.click(screen.getByRole('button', { name: 'Înainte' }))
    expect(await shownNames()).toEqual(names(21, 23))
    expect(screen.getByText(/Pagina/)).toHaveTextContent('Pagina 3 din 3')
    expect(screen.getByRole('button', { name: 'Înainte' })).toBeDisabled()

    await user.click(screen.getByRole('button', { name: 'Înapoi' }))
    expect(await shownNames()).toEqual(names(11, 20))
  })

  it('pagina din adresă e păstrată (refresh, „Înapoi” din browser)', async () => {
    openVisits('/vizite?pagina=2', 23)

    expect(await shownNames()).toEqual(names(11, 20))
    expect(screen.getByText(/Pagina/)).toHaveTextContent('Pagina 2 din 3')
  })

  it.each(['/vizite?pagina=99', '/vizite?pagina=abc'])('%s deschide o pagină validă', async (path) => {
    openVisits(path, 23)

    const expected = path.endsWith('99') ? names(21, 23) : names(1, 10)
    expect(await shownNames()).toEqual(expected)
  })

  it('cu 10 vizite sau mai puține, paginarea nu apare', async () => {
    openVisits('/vizite', 10)

    expect(await shownNames()).toEqual(names(1, 10))
    expect(screen.queryByRole('navigation', { name: 'Paginare' })).not.toBeInTheDocument()
  })
})
