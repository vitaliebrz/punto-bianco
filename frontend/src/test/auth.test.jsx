// Fluxul de autentificare, cu backend-ul simulat (fetch fals) — fără server real.
import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import App from '../App'
import AuthProvider from '../auth/AuthProvider'
import { json, mockFetch, renderAs, USERS } from './helpers'

const TOKEN_KEY = 'pb_token'

function renderApp(path = '/') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </MemoryRouter>,
  )
}

async function fillLogin(email, password) {
  const user = userEvent.setup()
  await user.type(screen.getByLabelText('Email'), email)
  await user.type(screen.getByLabelText('Parolă'), password)
  await user.click(screen.getByRole('button', { name: 'Intră în cont' }))
  return user
}

const emptyLists = {
  'GET /api/visits': json(200, []),
  'GET /api/notifications': json(200, { unreadCount: 0, items: [] }),
}

describe('autentificare', () => {
  it('neconectat: orice pagină trimite la login', async () => {
    mockFetch({})
    renderApp('/vizite')
    expect(await screen.findByText('Conectează-te la contul tău')).toBeInTheDocument()
  })

  it('parolă greșită: afișează mesajul serverului, fără să salveze token', async () => {
    mockFetch({ 'POST /api/auth/login': json(401, { error: 'Email sau parolă greșite' }) })
    renderApp('/login')

    await fillLogin('admin@puntobianco.demo', 'gresit')

    expect(await screen.findByRole('alert')).toHaveTextContent('Email sau parolă greșite')
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull()
  })

  it('login reușit: trimite exact { email, password }, arată numele + rolul și prima pagină a rolului', async () => {
    const fetchMock = mockFetch({
      'POST /api/auth/login': json(200, { token: 'token-admin', user: USERS.admin }),
      ...emptyLists,
    })
    renderApp('/login')

    await fillLogin('admin@puntobianco.demo', 'Demo1234!')

    expect(await screen.findByRole('heading', { name: 'Vizite' })).toBeInTheDocument()
    expect(screen.getByText('Elena Popescu')).toBeInTheDocument()
    expect(screen.getByText('Admin')).toBeInTheDocument()
    expect(screen.queryByText('Doar vizualizare.')).not.toBeInTheDocument()
    expect(localStorage.getItem(TOKEN_KEY)).toBe('token-admin')

    const [, options] = fetchMock.mock.calls[0]
    expect(options.method).toBe('POST')
    expect(JSON.parse(options.body)).toEqual({ email: 'admin@puntobianco.demo', password: 'Demo1234!' })
  })

  it('rol doar-citire: apare mențiunea „Doar vizualizare.”', async () => {
    mockFetch({ 'POST /api/auth/login': json(200, { token: 't', user: USERS.contabil }), ...emptyLists })
    renderApp('/login')

    await fillLogin('contabil@puntobianco.demo', 'Demo1234!')

    expect(await screen.findByText('Contabil')).toBeInTheDocument()
    expect(await screen.findByText('Doar vizualizare.')).toBeInTheDocument()
  })

  it('Ieșire: șterge token-ul și revine la login', async () => {
    renderAs(USERS.admin, '/', emptyLists)

    await userEvent.setup().click(await screen.findByRole('button', { name: 'Ieșire' }))

    expect(await screen.findByText('Conectează-te la contul tău')).toBeInTheDocument()
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull()
  })
})

describe('sesiunea după refresh', () => {
  it('token valid: rămâi conectat; token-ul e trimis în header-ul Authorization', async () => {
    const fetchMock = renderAs(USERS.admin, '/', emptyLists)

    expect(await screen.findByText('Elena Popescu')).toBeInTheDocument()
    const [, options] = fetchMock.mock.calls[0]
    expect(options.headers.Authorization).toBe('Bearer token')
  })

  it('token expirat (401): token șters, trimis la login', async () => {
    localStorage.setItem(TOKEN_KEY, 'token-expirat')
    mockFetch({ 'GET /api/auth/me': json(401, { error: 'Sesiune invalidă sau expirată' }) })
    renderApp('/')

    expect(await screen.findByText('Conectează-te la contul tău')).toBeInTheDocument()
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull()
  })

  it('server indisponibil: mesaj + „Reîncearcă”, token păstrat; după revenire intră în cont', async () => {
    localStorage.setItem(TOKEN_KEY, 'token-admin')
    let serverUp = false
    mockFetch({
      'GET /api/auth/me': () => {
        if (!serverUp) throw new TypeError('Failed to fetch')
        return json(200, { user: USERS.admin })
      },
      ...emptyLists,
    })
    renderApp('/')

    expect(await screen.findByRole('alert')).toHaveTextContent('Serverul nu răspunde')
    expect(localStorage.getItem(TOKEN_KEY)).toBe('token-admin')

    serverUp = true
    await userEvent.setup().click(screen.getByRole('button', { name: 'Reîncearcă' }))

    expect(await screen.findByText('Elena Popescu')).toBeInTheDocument()
  })
})
