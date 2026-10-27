// Formularul „Vizită nouă”, lista și detaliile, cu backend-ul simulat (fetch fals).
import { describe, expect, it } from 'vitest'
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { buildVisitPayload, initialVisitForm } from '../visitForm'
import { json, renderAs, sentBody, USERS, VISIT } from './helpers'

const COORDINATOR = USERS.coordonator
const CONTABIL = USERS.contabil

const coordinatorsRoute = {
  'GET /api/users/coordinators': json(200, [
    { id: 2, fullName: 'Ana Ciobanu' },
    { id: 3, fullName: 'Mihai Rusu' },
  ]),
}

describe('buildVisitPayload', () => {
  it('secțiunile nebifate devin null; coordonatorul conectat e preselectat', () => {
    const form = initialVisitForm(COORDINATOR)
    form.patient = { firstName: 'Marco', lastName: 'Rossi', treatment: 'Implant', availability: '' }
    form.arrivalAt = '2026-11-02T14:30'
    form.departureAt = '2026-11-09T10:00'
    // completat, apoi debifat: nu se trimite
    form.companion.firstName = 'Anna'
    form.accommodation.apartmentType = 'STUDIO'

    const payload = buildVisitPayload(form)
    expect(payload).toMatchObject({
      companion: null,
      accommodation: null,
      transfer: null,
      coordinatorId: 2,
    })
    expect(payload.arrivalAt).toBe(new Date('2026-11-02T14:30').toISOString())
  })

  it('însoțitor fără tratament: doar numele; cazare contra cost: fără zile', () => {
    const form = initialVisitForm(COORDINATOR)
    form.hasCompanion = true
    form.companion = { firstName: 'Anna', lastName: 'Rossi', treatment: 'ignorat', availability: 'ignorat' }
    form.needsAccommodation = true
    form.accommodation = { apartmentType: 'STUDIO', isFree: false, freeDays: '5' }

    const payload = buildVisitPayload(form)
    expect(payload.companion).toEqual({ firstName: 'Anna', lastName: 'Rossi' })
    expect(payload.accommodation).toEqual({ apartmentType: 'STUDIO', isFree: false })
  })
})

describe('formularul „Vizită nouă”', () => {
  it('bifele arată câmpurile; trimite datele completate și deschide detaliile', async () => {
    const fetchMock = renderAs(COORDINATOR, '/vizite/noua', {
      ...coordinatorsRoute,
      'POST /api/visits': json(201, VISIT),
      'GET /api/visits/42': json(200, VISIT),
    })
    const user = userEvent.setup()

    await user.type(await screen.findByLabelText('Prenume'), 'Marco')
    await user.type(screen.getByLabelText('Nume'), 'Rossi')
    await user.type(screen.getByLabelText('Tratament'), 'Implant')

    expect(screen.queryByLabelText('Prenume însoțitor')).not.toBeInTheDocument()
    await user.click(screen.getByLabelText('Vine cu însoțitor'))
    await user.type(screen.getByLabelText('Prenume însoțitor'), 'Anna')
    await user.type(screen.getByLabelText('Nume însoțitor'), 'Rossi')
    expect(screen.queryByLabelText('Tratament însoțitor')).not.toBeInTheDocument()
    await user.click(screen.getByLabelText('Însoțitorul are și el tratament'))
    await user.type(screen.getByLabelText('Tratament însoțitor'), 'Albire')

    await user.type(screen.getByLabelText('Sosire (data și ora)'), '2026-11-02T14:30')
    await user.type(screen.getByLabelText('Plecare (data și ora)'), '2026-11-09T10:00')

    await user.click(screen.getByLabelText('Are nevoie de cazare'))
    await user.selectOptions(screen.getByLabelText('Tipul apartamentului'), 'STUDIO')
    await user.click(screen.getByLabelText('Cazare gratuită'))
    await user.type(screen.getByLabelText('Pentru câte zile e gratuită'), '3')

    await user.click(screen.getByLabelText('Are nevoie de transfer'))
    await user.click(screen.getByLabelText('Gratuit'))
    await user.click(screen.getByLabelText('Dus-întors'))

    // coordonatorul conectat e deja ales
    expect(screen.getByLabelText('Coordonator')).toHaveValue('2')

    await user.click(screen.getByRole('button', { name: 'Înregistrează vizita' }))

    expect(await screen.findByText('Vizita a fost înregistrată, echipa a fost anunțată.')).toBeInTheDocument()
    expect(screen.getByText('Detalii vizită')).toBeInTheDocument()

    expect(sentBody(fetchMock, 'POST', '/api/visits')).toEqual({
      patient: { firstName: 'Marco', lastName: 'Rossi', treatment: 'Implant', availability: '' },
      companion: { firstName: 'Anna', lastName: 'Rossi', treatment: 'Albire', availability: '' },
      arrivalAt: new Date('2026-11-02T14:30').toISOString(),
      departureAt: new Date('2026-11-09T10:00').toISOString(),
      coordinatorId: 2,
      accommodation: { apartmentType: 'STUDIO', isFree: true, freeDays: 3 },
      transfer: { isFree: true, direction: 'DUS_INTORS' },
    })
  })

  it('erorile serverului apar lângă câmpuri', async () => {
    renderAs(COORDINATOR, '/vizite/noua', {
      ...coordinatorsRoute,
      'POST /api/visits': json(400, {
        error: 'Date invalide',
        details: [
          { field: 'patient.firstName', message: 'Câmp obligatoriu' },
          { field: 'departureAt', message: 'Plecarea trebuie să fie după sosire' },
        ],
      }),
    })
    const user = userEvent.setup()

    await user.click(await screen.findByRole('button', { name: 'Înregistrează vizita' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Verifică câmpurile marcate cu roșu.')
    expect(screen.getByLabelText('Prenume')).toHaveAccessibleDescription('Câmp obligatoriu')
    expect(screen.getByLabelText('Plecare (data și ora)')).toHaveAccessibleDescription(
      'Plecarea trebuie să fie după sosire',
    )
    expect(screen.getByRole('button', { name: 'Înregistrează vizita' })).toBeEnabled()
  })
})

describe('lista vizitelor', () => {
  it('coordonator: vede vizitele și butonul „Vizită nouă”', async () => {
    renderAs(COORDINATOR, '/vizite', { 'GET /api/visits': json(200, [VISIT]) })

    const card = (await screen.findByText('Marco Rossi, Anna Rossi')).closest('li')
    expect(within(card).getByText('Nepreluat')).toBeInTheDocument()
    expect(within(card).getByText('Studio')).toBeInTheDocument()
    expect(within(card).getByText('Dus-întors')).toBeInTheDocument()
    expect(within(card).getByText('02.11.2026 14:30')).toBeInTheDocument()
    const header = screen.getByRole('heading', { name: 'Vizite' }).closest('header')
    expect(within(header).getByRole('link', { name: 'Vizită nouă' })).toHaveAttribute('href', '/vizite/noua')
  })

  it('contabil: doar vizualizare, fără „Vizită nouă”', async () => {
    renderAs(CONTABIL, '/vizite', { 'GET /api/visits': json(200, [VISIT]) })

    expect(await screen.findByText('Marco Rossi, Anna Rossi')).toBeInTheDocument()
    expect(screen.getByText('Doar vizualizare.')).toBeInTheDocument()
    expect(screen.queryByText('Vizită nouă')).not.toBeInTheDocument()
  })

  it('contabil nu poate deschide formularul (trimis la prima lui pagină)', async () => {
    renderAs(CONTABIL, '/vizite/noua', { 'GET /api/visits': json(200, []) })
    expect(await screen.findByRole('heading', { name: 'Vizite' })).toBeInTheDocument()
    expect(screen.queryByText('Coordonator responsabil')).not.toBeInTheDocument()
  })
})
