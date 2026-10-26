// Fluxul de autentificare, cu backend-ul simulat (fetch fals) — fără server real.
import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import App from '../App'
import AuthProvider from '../auth/AuthProvider'

const TOKEN_KEY = 'pb_token'

const USERS = {
  admin: { id: 1, email: 'admin@puntobianco.demo', fullName: 'Elena Popescu', role: 'ADMIN' },
  contabil: { id: 8, email: 'contabil@puntobianco.demo', fullName: 'Natalia Ceban', role: 'CONTABIL' },
}

const json = (status, body) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => body,
})

// Înlocuiește fetch cu o funcție care răspunde după adresă: routes = { '/api/auth/me': fn | răspuns }
function mockFetch(routes) {
  const fetchMock = vi.fn(async (url, options = {}) => {
    const path = new URL(url).pathname
    const handler = routes[path]
    if (!handler) throw new Error(`Cerere neașteptată: ${path}`)
    return typeof handler === 'function' ? handler(options) : handler
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

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

describe('autentificare', () => {
  it('neconectat: orice pagină trimite la login', async () => {
    mockFetch({})
    renderApp('/')
    expect(await screen.findByText('Conectează-te la contul tău')).toBeInTheDocument()
  })

  it('parolă greșită: afișează mesajul serverului, fără să salveze token', async () => {
    mockFetch({ '/api/auth/login': json(401, { error: 'Email sau parolă greșite' }) })
    renderApp('/login')

    await fillLogin('admin@puntobianco.demo', 'gresit')

    expect(await screen.findByRole('alert')).toHaveTextContent('Email sau parolă greșite')
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull()
  })

  it('login reușit: trimite exact { email, password } și arată numele + rolul', async () => {
    const fetchMock = mockFetch({
      '/api/auth/login': json(200, { token: 'token-admin', user: USERS.admin }),
    })
    renderApp('/login')

    await fillLogin('admin@puntobianco.demo', 'Demo1234!')

    expect(await screen.findByText('Bun venit, Elena Popescu!')).toBeInTheDocument()
    expect(screen.getByText('Admin')).toBeInTheDocument()
    expect(screen.queryByText(/doar la vizualizare/)).not.toBeInTheDocument()
    expect(localStorage.getItem(TOKEN_KEY)).toBe('token-admin')

    const [, options] = fetchMock.mock.calls[0]
    expect(options.method).toBe('POST')
    expect(JSON.parse(options.body)).toEqual({ email: 'admin@puntobianco.demo', password: 'Demo1234!' })
  })

  it('rol doar-citire: apare mențiunea „acces doar la vizualizare”', async () => {
    mockFetch({ '/api/auth/login': json(200, { token: 't', user: USERS.contabil }) })
    renderApp('/login')

    await fillLogin('contabil@puntobianco.demo', 'Demo1234!')

    expect(await screen.findByText('Contabil')).toBeInTheDocument()
    expect(screen.getByText('Rolul tău are acces doar la vizualizare.')).toBeInTheDocument()
  })

  it('Ieșire: șterge token-ul și revine la login', async () => {
    localStorage.setItem(TOKEN_KEY, 'token-admin')
    mockFetch({ '/api/auth/me': json(200, { user: USERS.admin }) })
    renderApp('/')

    await userEvent.setup().click(await screen.findByRole('button', { name: 'Ieșire' }))

    expect(await screen.findByText('Conectează-te la contul tău')).toBeInTheDocument()
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull()
  })
})

describe('sesiunea după refresh', () => {
  it('token valid: rămâi conectat; token-ul e trimis în header-ul Authorization', async () => {
    localStorage.setItem(TOKEN_KEY, 'token-admin')
    const fetchMock = mockFetch({ '/api/auth/me': json(200, { user: USERS.admin }) })
    renderApp('/')

    expect(await screen.findByText('Bun venit, Elena Popescu!')).toBeInTheDocument()
    const [, options] = fetchMock.mock.calls[0]
    expect(options.headers.Authorization).toBe('Bearer token-admin')
  })

  it('token expirat (401): token șters, trimis la login', async () => {
    localStorage.setItem(TOKEN_KEY, 'token-expirat')
    mockFetch({ '/api/auth/me': json(401, { error: 'Sesiune invalidă sau expirată' }) })
    renderApp('/')

    expect(await screen.findByText('Conectează-te la contul tău')).toBeInTheDocument()
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull()
  })

  it('server indisponibil: mesaj + „Reîncearcă”, token păstrat; după revenire intră în cont', async () => {
    localStorage.setItem(TOKEN_KEY, 'token-admin')
    let serverUp = false
    mockFetch({
      '/api/auth/me': () => {
        if (!serverUp) throw new TypeError('Failed to fetch')
        return json(200, { user: USERS.admin })
      },
    })
    renderApp('/')

    expect(await screen.findByRole('alert')).toHaveTextContent('Serverul nu răspunde')
    expect(localStorage.getItem(TOKEN_KEY)).toBe('token-admin')

    serverUp = true
    await userEvent.setup().click(screen.getByRole('button', { name: 'Reîncearcă' }))

    expect(await screen.findByText('Bun venit, Elena Popescu!')).toBeInTheDocument()
  })
})
