// Ajutoare pentru teste: backend simulat (fetch fals) și aplicația pornită cu un utilizator conectat.
import { vi } from 'vitest'
import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import App from '../App'
import AuthProvider from '../auth/AuthProvider'

export const USERS = {
  admin: { id: 1, email: 'admin@puntobianco.demo', fullName: 'Elena Popescu', role: 'ADMIN' },
  coordonator: { id: 2, email: 'coordonator1@puntobianco.demo', fullName: 'Ana Ciobanu', role: 'COORDONATOR' },
  backoffice: { id: 4, email: 'backoffice@puntobianco.demo', fullName: 'Irina Lungu', role: 'BACK_OFFICE' },
  cazari: { id: 5, email: 'cazari@puntobianco.demo', fullName: 'Victor Munteanu', role: 'MANAGER_CAZARI' },
  sofer: { id: 6, email: 'sofer1@puntobianco.demo', fullName: 'Andrei Cojocaru', role: 'SOFER' },
  contabil: { id: 8, email: 'contabil@puntobianco.demo', fullName: 'Natalia Ceban', role: 'CONTABIL' },
}

export const json = (status, body) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => body,
})

// Cererile pe care testul nu le-a simulat. Pagina le vede ca „serverul nu răspunde” și de multe ori
// le înghite (ex. clopoțelul), deci testul ar trece fără să observe; setup.js pică testul dacă lista nu e goală.
export const unexpectedRequests = []

// routes = { 'GET /api/visits': răspuns | (options) => răspuns }
export function mockFetch(routes) {
  const fetchMock = vi.fn(async (url, options = {}) => {
    const key = `${options.method ?? 'GET'} ${new URL(url).pathname}`
    const handler = routes[key]
    if (!handler) {
      unexpectedRequests.push(key)
      throw new Error(`Cerere neașteptată: ${key}`)
    }
    return typeof handler === 'function' ? handler(options) : handler
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

// Pornește aplicația la adresa `path`, cu `user` deja conectat (token salvat + /api/auth/me).
// Clopoțelul (Back office, Manager cazări) face parte din cadrul paginii: implicit nu are notificări.
export function renderAs(user, path, routes = {}) {
  localStorage.setItem('pb_token', 'token')
  const fetchMock = mockFetch({
    'GET /api/auth/me': json(200, { user }),
    'GET /api/notifications': json(200, { unreadCount: 0, items: [] }),
    ...routes,
  })
  render(
    <MemoryRouter initialEntries={[path]}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </MemoryRouter>,
  )
  return fetchMock
}

// Corpul JSON trimis la cererea `METHOD /cale` (prima găsită)
export function sentBody(fetchMock, method, path) {
  const call = fetchMock.mock.calls.find(
    ([url, options]) => (options?.method ?? 'GET') === method && new URL(url).pathname === path,
  )
  return call && JSON.parse(call[1].body)
}

export const VISIT = {
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
