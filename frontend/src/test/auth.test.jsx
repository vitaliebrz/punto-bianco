// Fluxul de autentificare, cu backend-ul simulat (fetch fals) — fără server real.
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import App from '../App'
import { apiFetch, REQUEST_TIMEOUT_MS } from '../api'
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

  it('butonul cu ochi arată și ascunde parola', async () => {
    mockFetch({})
    renderApp('/login')
    const user = userEvent.setup()
    const password = screen.getByLabelText('Parolă')
    await user.type(password, 'Demo1234!')
    expect(password).toHaveAttribute('type', 'password')

    await user.click(screen.getByRole('button', { name: 'Arată parola' }))
    expect(password).toHaveAttribute('type', 'text')
    expect(password).toHaveValue('Demo1234!')

    await user.click(screen.getByRole('button', { name: 'Ascunde parola' }))
    expect(password).toHaveAttribute('type', 'password')
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

// Evenimentul „storage” e trimis de browser doar în CELELALTE tab-uri; aici îl trimitem noi
const otherTabChangedToken = () =>
  act(() => window.dispatchEvent(new StorageEvent('storage', { key: TOKEN_KEY })))

describe('mai multe tab-uri', () => {
  it('Ieșire în alt tab: și tab-ul acesta revine la login (datele nu rămân pe ecran)', async () => {
    renderAs(USERS.admin, '/', emptyLists)
    expect(await screen.findByText('Elena Popescu')).toBeInTheDocument()

    localStorage.removeItem(TOKEN_KEY)
    otherTabChangedToken()

    expect(await screen.findByText('Conectează-te la contul tău')).toBeInTheDocument()
    expect(screen.queryByText('Elena Popescu')).not.toBeInTheDocument()
  })

  it('login în alt tab: tab-ul acesta intră și el în cont', async () => {
    mockFetch({ 'GET /api/auth/me': json(200, { user: USERS.admin }), ...emptyLists })
    renderApp('/login')
    expect(await screen.findByText('Conectează-te la contul tău')).toBeInTheDocument()

    localStorage.setItem(TOKEN_KEY, 'token-admin')
    otherTabChangedToken()

    expect(await screen.findByText('Elena Popescu')).toBeInTheDocument()
  })
})

describe('localStorage blocat (ex. mod privat)', () => {
  it('login-ul merge: tokenul ținut în memorie e trimis la cererile următoare', async () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Stocare blocată', 'SecurityError')
    })
    const fetchMock = mockFetch({
      'POST /api/auth/login': json(200, { token: 'token-memorie', user: USERS.admin }),
      ...emptyLists,
    })
    renderApp('/login')

    await fillLogin('admin@puntobianco.demo', 'Demo1234!')

    expect(await screen.findByRole('heading', { name: 'Vizite' })).toBeInTheDocument()
    const visitsCall = fetchMock.mock.calls.find(([url]) => new URL(url).pathname === '/api/visits')
    expect(visitsCall[1].headers.Authorization).toBe('Bearer token-memorie')
  })
})

describe('cererile au un timp limită', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it(`fără răspuns în ${REQUEST_TIMEOUT_MS / 1000} s: cererea se oprește cu „Serverul nu răspunde”`, async () => {
    vi.useFakeTimers()
    // un server care nu răspunde niciodată; cererea se termină doar când e oprită
    vi.stubGlobal(
      'fetch',
      vi.fn((_url, { signal }) => new Promise((_resolve, reject) => {
        signal.addEventListener('abort', () => reject(new DOMException('Oprită', 'AbortError')))
      })),
    )

    const request = apiFetch('/api/visits')
    const outcome = expect(request).rejects.toMatchObject({ status: 0, message: expect.stringContaining('Serverul nu răspunde') })
    await vi.advanceTimersByTimeAsync(REQUEST_TIMEOUT_MS)
    await outcome
  })
})
