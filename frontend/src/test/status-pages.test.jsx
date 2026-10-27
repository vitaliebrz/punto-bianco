// Paginile Back office și Cazări: butoanele de status, conflictul 409, rolurile doar-citire.
import { describe, expect, it } from 'vitest'
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { json, renderAs, sentBody, USERS, VISIT } from './helpers'

const startedVisit = { ...VISIT, id: 43, backOfficeStatus: 'INCEPUT', backOfficeStartedAt: '2026-11-02T13:00:00.000Z' }
const finishedVisit = { ...VISIT, id: 44, backOfficeStatus: 'FINALIZAT' }

const cardOf = async (id) =>
  (await screen.findAllByRole('link', { name: 'Marco Rossi, Anna Rossi' }))
    .find((link) => link.getAttribute('href') === `/vizite/${id}`)
    .closest('li')

describe('Back office', () => {
  it('butonul potrivit fiecărui status: Nepreluat -> „Început”, Început -> „Finalizat”, Finalizat -> niciunul', async () => {
    renderAs(USERS.backoffice, '/back-office', {
      'GET /api/visits': json(200, [VISIT, startedVisit, finishedVisit]),
    })

    expect(within(await cardOf(42)).getByRole('button')).toHaveTextContent('Început')
    expect(within(await cardOf(43)).getByRole('button')).toHaveTextContent('Finalizat')
    expect(within(await cardOf(44)).queryByRole('button')).not.toBeInTheDocument()

    // rezumatul: câte vizite are fiecare status
    const summary = screen.getByRole('list', { name: 'Rezumat' })
    expect(within(summary).getAllByRole('listitem').map((item) => item.textContent)).toEqual([
      '1Nepreluat',
      '1Început',
      '1Finalizat',
    ])
  })

  it('„Început”: trimite INCEPUT și actualizează cardul', async () => {
    const fetchMock = renderAs(USERS.backoffice, '/back-office', {
      'GET /api/visits': json(200, [VISIT]),
      'PATCH /api/visits/42/back-office-status': json(200, { ...VISIT, backOfficeStatus: 'INCEPUT' }),
    })

    const card = await cardOf(42)
    await userEvent.setup().click(within(card).getByRole('button', { name: 'Început' }))

    expect(await within(card).findByRole('button', { name: 'Finalizat' })).toBeInTheDocument()
    expect(within(card).getByText('Început')).toHaveAttribute('data-status', 'INCEPUT')
    expect(sentBody(fetchMock, 'PATCH', '/api/visits/42/back-office-status')).toEqual({ status: 'INCEPUT' })
  })

  it('409 (altcineva a apăsat deja): mesaj + lista reîncărcată', async () => {
    let listCalls = 0
    renderAs(USERS.backoffice, '/back-office', {
      'GET /api/visits': () => {
        listCalls += 1
        return json(200, [listCalls === 1 ? VISIT : startedVisit])
      },
      'PATCH /api/visits/42/back-office-status': json(409, {
        error: 'Statusul a fost deja schimbat. Reîncarcă lista.',
      }),
    })

    await userEvent.setup().click(within(await cardOf(42)).getByRole('button', { name: 'Început' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Statusul a fost deja schimbat')
    expect(await screen.findByRole('button', { name: 'Finalizat' })).toBeInTheDocument()
    expect(listCalls).toBe(2)
  })

  it('două carduri salvate în paralel: primul rămâne blocat până la răspunsul lui (fără trimitere dublă)', async () => {
    const otherVisit = { ...VISIT, id: 45 }
    let finishFirst
    const fetchMock = renderAs(USERS.backoffice, '/back-office', {
      'GET /api/visits': json(200, [VISIT, otherVisit]),
      'PATCH /api/visits/42/back-office-status': () => new Promise((resolve) => (finishFirst = resolve)),
      'PATCH /api/visits/45/back-office-status': json(200, { ...otherVisit, backOfficeStatus: 'INCEPUT' }),
    })
    const user = userEvent.setup()
    const first = await cardOf(42)
    const second = await cardOf(45)

    await user.click(within(first).getByRole('button', { name: 'Început' }))
    await user.click(within(second).getByRole('button', { name: 'Început' }))
    expect(await within(second).findByRole('button', { name: 'Finalizat' })).toBeInTheDocument()

    // al doilea card a terminat, dar primul încă așteaptă: butonul lui rămâne blocat
    const firstButton = within(first).getByRole('button', { name: /Se salvează/ })
    expect(firstButton).toBeDisabled()
    await user.click(firstButton)
    const patches = fetchMock.mock.calls.filter(([url]) => new URL(url).pathname === '/api/visits/42/back-office-status')
    expect(patches).toHaveLength(1)

    finishFirst(json(200, { ...VISIT, backOfficeStatus: 'INCEPUT' }))
    expect(await within(first).findByRole('button', { name: 'Finalizat' })).toBeEnabled()
  })

  it('contabil: vede lista, fără butoane', async () => {
    renderAs(USERS.contabil, '/back-office', { 'GET /api/visits': json(200, [VISIT, startedVisit]) })

    expect(await cardOf(42)).toBeInTheDocument()
    expect(screen.getByText('Doar vizualizare.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Început|Finalizat/ })).not.toBeInTheDocument()
  })
})

describe('Cazări', () => {
  const request = {
    id: 5,
    apartmentType: 'DOUA_DORMITOARE_LIVING',
    isFree: true,
    freeDays: 1,
    status: 'NEPRELUCRAT',
    reservedAt: null,
    visit: {
      id: 42,
      arrivalAt: VISIT.arrivalAt,
      departureAt: VISIT.departureAt,
      coordinator: VISIT.coordinator,
      patients: VISIT.patients,
    },
  }

  it('cerere neprelucrată: „Marchează rezervat” -> REZERVAT', async () => {
    const fetchMock = renderAs(USERS.cazari, '/cazari', {
      'GET /api/accommodations': json(200, [request]),
      'PATCH /api/accommodations/5/status': json(200, {
        ...request,
        status: 'REZERVAT',
        reservedAt: '2026-11-01T10:00:00.000Z',
      }),
    })

    const card = await cardOf(42)
    expect(within(card).getByText('Neprelucrat')).toBeInTheDocument()
    expect(within(card).getByText('2 dormitoare + living')).toBeInTheDocument()
    expect(within(card).getByText('Gratuită 1 zi')).toBeInTheDocument()

    await userEvent.setup().click(within(card).getByRole('button', { name: 'Marchează rezervat' }))

    expect(await within(card).findByText('Rezervat')).toBeInTheDocument()
    expect(within(card).getByText('01.11.2026 12:00')).toBeInTheDocument()
    expect(within(card).queryByRole('button')).not.toBeInTheDocument()
    expect(sentBody(fetchMock, 'PATCH', '/api/accommodations/5/status')).toEqual({ status: 'REZERVAT' })
  })

  it('409 (cererea a fost deja rezervată): mesaj + lista reîncărcată', async () => {
    let listCalls = 0
    renderAs(USERS.cazari, '/cazari', {
      'GET /api/accommodations': () => {
        listCalls += 1
        return json(200, [listCalls === 1 ? request : { ...request, status: 'REZERVAT', reservedAt: '2026-11-01T10:00:00.000Z' }])
      },
      'PATCH /api/accommodations/5/status': json(409, { error: 'Cererea a fost deja rezervată.' }),
    })

    await userEvent.setup().click(within(await cardOf(42)).getByRole('button', { name: 'Marchează rezervat' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Cererea a fost deja rezervată.')
    expect(await within(await cardOf(42)).findByText('Rezervat')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Marchează rezervat' })).not.toBeInTheDocument()
    expect(listCalls).toBe(2)
  })

  it('control calitate: doar vizualizare', async () => {
    renderAs({ ...USERS.contabil, role: 'CONTROL_CALITATE' }, '/cazari', {
      'GET /api/accommodations': json(200, [request]),
    })

    expect(await cardOf(42)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Marchează rezervat' })).not.toBeInTheDocument()
  })

  it('detaliile vizitei fără date medicale (cum le primește managerul de cazări): fără tratament și disponibilitate', async () => {
    const withoutMedical = {
      ...VISIT,
      patients: VISIT.patients.map(({ id, firstName, lastName, isCompanion }) => ({ id, firstName, lastName, isCompanion })),
    }
    renderAs(USERS.cazari, '/vizite/42', { 'GET /api/visits/42': json(200, withoutMedical) })

    expect(await screen.findByText('Marco Rossi')).toBeInTheDocument()
    expect(screen.getByText('Anna Rossi')).toBeInTheDocument()
    expect(screen.getByText('Studio')).toBeInTheDocument()
    expect(screen.queryByText('Tratament')).not.toBeInTheDocument()
    expect(screen.queryByText('Disponibilitate')).not.toBeInTheDocument()
    expect(screen.queryByText('Fără tratament')).not.toBeInTheDocument()
  })

  it('șoferul nu are acces la pagina de cazări (trimis la calendar)', async () => {
    renderAs(USERS.sofer, '/cazari', { 'GET /api/transfers': json(200, []) })
    expect(await screen.findByRole('heading', { name: 'Calendar transferuri' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Cazări' })).not.toBeInTheDocument()
  })
})
