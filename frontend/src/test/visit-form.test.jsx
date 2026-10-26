// Formularul „Vizită nouă”, lista și detaliile, cu backend-ul simulat (fetch fals).
import { describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import App from '../App'
import AuthProvider from '../auth/AuthProvider'
import { buildVisitPayload, initialVisitForm } from '../visitForm'

const COORDINATOR = { id: 2, email: 'coordonator1@puntobianco.demo', fullName: 'Ana Ciobanu', role: 'COORDONATOR' }
const CONTABIL = { id: 8, email: 'contabil@puntobianco.demo', fullName: 'Natalia Ceban', role: 'CONTABIL' }

const json = (status, body) => ({ ok: status >= 200 && status < 300, status, json: async () => body })

const VISIT = {
  id: 42,
  arrivalAt: '2026-11-02T12:30:00.000Z',
  departureAt: '2026-11-09T08:00:00.000Z',
  hasCompanion: true,
  coordinator: { id: 2, fullName: 'Ana Ciobanu' },
  backOfficeStatus: 'NEPRELUAT',
  backOfficeStartedAt: null,
  backOfficeFinishedAt: null,
  patients: [
    { id: 1, firstName: 'Marco', lastName: 'Rossi', isCompanion: false, treatment: 'Implant', availability: 'După 12:00' },
    { id: 2, firstName: 'Anna', lastName: 'Rossi', isCompanion: true, treatment: null, availability: null },
  ],
  accommodation: { id: 5, apartmentType: 'STUDIO', isFree: true, freeDays: 3, status: 'NEPRELUCRAT' },
  transfer: { isFree: false, direction: 'DUS_INTORS' },
}

// routes = { 'GET /api/visits': răspuns | (options) => răspuns }
function mockFetch(routes) {
  const fetchMock = vi.fn(async (url, options = {}) => {
    const key = `${options.method ?? 'GET'} ${new URL(url).pathname}`
    const handler = routes[key]
    if (!handler) throw new Error(`Cerere neașteptată: ${key}`)
    return typeof handler === 'function' ? handler(options) : handler
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

function renderAs(user, path, routes) {
  localStorage.setItem('pb_token', 'token')
  const fetchMock = mockFetch({ 'GET /api/auth/me': json(200, { user }), ...routes })
  render(
    <MemoryRouter initialEntries={[path]}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </MemoryRouter>,
  )
  return fetchMock
}

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

    const [, options] = fetchMock.mock.calls.find(([, o]) => o?.method === 'POST')
    expect(JSON.parse(options.body)).toEqual({
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
    const header = screen.getByRole('heading', { name: 'Vizite' }).parentElement
    expect(within(header).getByRole('link', { name: 'Vizită nouă' })).toHaveAttribute('href', '/vizite/noua')
  })

  it('contabil: doar vizualizare, fără „Vizită nouă”', async () => {
    renderAs(CONTABIL, '/vizite', { 'GET /api/visits': json(200, [VISIT]) })

    expect(await screen.findByText('Marco Rossi, Anna Rossi')).toBeInTheDocument()
    expect(screen.getByText('Doar vizualizare.')).toBeInTheDocument()
    expect(screen.queryByText('Vizită nouă')).not.toBeInTheDocument()
  })

  it('contabil nu poate deschide formularul (trimis la pagina principală)', async () => {
    renderAs(CONTABIL, '/vizite/noua', {})
    expect(await screen.findByText('Bun venit, Natalia Ceban!')).toBeInTheDocument()
  })
})
