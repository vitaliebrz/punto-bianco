// Pagina „Utilizatori” (doar Admin): lista, contul nou, dezactivarea / reactivarea.
import { describe, expect, it, vi } from 'vitest'
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { json, renderAs, sentBody, USERS } from './helpers'

const account = (fields) => ({ active: true, createdAt: '2026-10-20T08:00:00.000Z', ...fields })
const ADMIN = account(USERS.admin)
const IRINA = account(USERS.backoffice)
const ANDREI = account({ ...USERS.sofer, active: false })
const NEW = account({ id: 20, email: 'maria.lungu@puntobianco.demo', fullName: 'Maria Lungu', role: 'BACK_OFFICE' })

// Rândul unui utilizator din listă (numele apare și în bara laterală, la utilizatorul conectat)
const userList = () => screen.getByRole('list', { name: 'Lista utilizatorilor' })
const rowOf = (name) => within(userList()).getByText(name).closest('li')
// Numele din listă, în ordinea afișării (fără „(tu)”)
const listedNames = () =>
  within(userList())
    .getAllByRole('listitem')
    .map((row) => row.querySelector('p').firstChild.textContent)

describe('pagina Utilizatori', () => {
  it('lista: rol, stare; contul propriu are „(tu)” și niciun buton', async () => {
    renderAs(USERS.admin, '/utilizatori', { 'GET /api/users': json(200, [ADMIN, IRINA, ANDREI]) })

    expect(await screen.findByText('Irina Lungu')).toBeInTheDocument()
    const irina = rowOf('Irina Lungu')
    expect(within(irina).getByText('backoffice@puntobianco.demo')).toBeInTheDocument()
    expect(within(irina).getByText('Back office')).toBeInTheDocument()
    expect(within(irina).getByText('Activ')).toHaveAttribute('data-status', 'ACTIV')
    expect(within(irina).getByRole('button', { name: 'Dezactivează contul lui Irina Lungu' })).toBeInTheDocument()

    const andrei = rowOf('Andrei Cojocaru')
    expect(within(andrei).getByText('Inactiv')).toBeInTheDocument()
    expect(within(andrei).getByRole('button', { name: 'Reactivează contul lui Andrei Cojocaru' })).toBeInTheDocument()

    const mine = rowOf('Elena Popescu')
    expect(within(mine).getByText('(tu)')).toBeInTheDocument()
    expect(within(mine).queryByRole('button')).not.toBeInTheDocument()
  })

  it('cont nou: trimite exact datele din formular, arată mesajul și contul în listă (fără reîncărcarea listei)', async () => {
    const fetchMock = renderAs(USERS.admin, '/utilizatori', {
      'GET /api/users': json(200, [ADMIN, IRINA]),
      'POST /api/users': json(201, NEW),
    })
    const user = userEvent.setup()

    await user.click(await screen.findByRole('button', { name: 'Utilizator nou' }))
    await user.type(screen.getByLabelText('Nume complet'), 'Maria Lungu')
    await user.type(screen.getByLabelText('Email'), 'maria.lungu@puntobianco.demo')
    await user.click(screen.getByRole('button', { name: /^Rol / }))
    await user.click(screen.getByRole('option', { name: 'Back office' }))
    const password = screen.getByLabelText('Parolă inițială')
    await user.type(password, 'Parola123')
    expect(password).toHaveAttribute('type', 'password')
    await user.click(screen.getByRole('button', { name: 'Arată parola' }))
    expect(password).toHaveAttribute('type', 'text')

    await user.click(screen.getByRole('button', { name: 'Creează contul' }))

    expect(await screen.findByRole('status')).toHaveTextContent(
      'Contul lui Maria Lungu a fost creat. Comunică-i colegului emailul (maria.lungu@puntobianco.demo) și parola.',
    )
    expect(await screen.findByRole('button', { name: 'Dezactivează contul lui Maria Lungu' })).toBeInTheDocument()
    // formularul s-a închis, butonul „Utilizator nou” e din nou disponibil
    expect(screen.queryByLabelText('Nume complet')).not.toBeInTheDocument()
    expect(sentBody(fetchMock, 'POST', '/api/users')).toEqual({
      fullName: 'Maria Lungu',
      email: 'maria.lungu@puntobianco.demo',
      role: 'BACK_OFFICE',
      password: 'Parola123',
    })
    // contul vine din răspunsul POST; o reîncărcare a listei ar putea suprascrie o schimbare mai nouă
    const listLoads = fetchMock.mock.calls.filter(
      ([url, options]) => (options?.method ?? 'GET') === 'GET' && new URL(url).pathname === '/api/users',
    )
    expect(listLoads).toHaveLength(1)
    // ordinea: activii după nume (Elena, Irina, Maria)
    expect(listedNames()).toEqual(['Elena Popescu', 'Irina Lungu', 'Maria Lungu'])
  })

  it('un cont dezactivat trece imediat la sfârșit, în grupul conturilor inactive', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    renderAs(USERS.admin, '/utilizatori', {
      'GET /api/users': json(200, [ADMIN, IRINA, ANDREI]),
      'PATCH /api/users/4/active': json(200, { ...IRINA, active: false }),
    })

    await userEvent.setup().click(await screen.findByRole('button', { name: 'Dezactivează contul lui Irina Lungu' }))

    expect(await within(rowOf('Irina Lungu')).findByText('Inactiv')).toBeInTheDocument()
    // activii întâi, apoi inactivii după nume: Andrei înaintea Irinei
    expect(listedNames()).toEqual(['Elena Popescu', 'Andrei Cojocaru', 'Irina Lungu'])
  })

  it('email deja folosit (409): eroarea apare la câmpul Email și dispare când e corectat', async () => {
    renderAs(USERS.admin, '/utilizatori', {
      'GET /api/users': json(200, [ADMIN]),
      'POST /api/users': json(409, {
        error: 'Date invalide',
        details: [{ field: 'email', message: 'Există deja un cont cu acest email' }],
      }),
    })
    const user = userEvent.setup()

    await user.click(await screen.findByRole('button', { name: 'Utilizator nou' }))
    const email = screen.getByLabelText('Email')
    await user.type(email, 'irina@puntobianco.demo')
    await user.click(screen.getByRole('button', { name: 'Creează contul' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Verifică câmpurile marcate cu roșu.')
    expect(email).toHaveAccessibleDescription('Există deja un cont cu acest email')
    expect(screen.getByRole('button', { name: 'Creează contul' })).toBeEnabled()

    await user.type(email, 'x')
    expect(email).not.toHaveAccessibleDescription('Există deja un cont cu acest email')
  })

  it('dezactivare: cere confirmare; „Anulează” nu trimite nimic', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    const fetchMock = renderAs(USERS.admin, '/utilizatori', { 'GET /api/users': json(200, [ADMIN, IRINA]) })

    await userEvent.setup().click(await screen.findByRole('button', { name: 'Dezactivează contul lui Irina Lungu' }))

    expect(confirm).toHaveBeenCalledWith('Dezactivezi contul lui Irina Lungu? Nu va mai putea intra în aplicație.')
    expect(fetchMock.mock.calls.some(([, options]) => options?.method === 'PATCH')).toBe(false)
    expect(within(rowOf('Irina Lungu')).getByText('Activ')).toBeInTheDocument()
  })

  it('dezactivare confirmată: trimite active=false și actualizează rândul; reactivarea nu cere confirmare', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true)
    const fetchMock = renderAs(USERS.admin, '/utilizatori', {
      'GET /api/users': json(200, [ADMIN, IRINA]),
      'PATCH /api/users/4/active': (options) => json(200, { ...IRINA, ...JSON.parse(options.body) }),
    })
    const user = userEvent.setup()

    await user.click(await screen.findByRole('button', { name: 'Dezactivează contul lui Irina Lungu' }))
    expect(await within(rowOf('Irina Lungu')).findByText('Inactiv')).toBeInTheDocument()
    expect(sentBody(fetchMock, 'PATCH', '/api/users/4/active')).toEqual({ active: false })

    confirm.mockClear()
    await user.click(screen.getByRole('button', { name: 'Reactivează contul lui Irina Lungu' }))
    expect(await within(rowOf('Irina Lungu')).findByText('Activ')).toBeInTheDocument()
    expect(confirm).not.toHaveBeenCalled()
  })

  it('eroare la dezactivare: mesajul apare, rândul rămâne neschimbat', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    renderAs(USERS.admin, '/utilizatori', {
      'GET /api/users': json(200, [ADMIN, IRINA]),
      'PATCH /api/users/4/active': json(500, { error: 'Eroare internă' }),
    })

    await userEvent.setup().click(await screen.findByRole('button', { name: 'Dezactivează contul lui Irina Lungu' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Eroare internă')
    expect(within(rowOf('Irina Lungu')).getByText('Activ')).toBeInTheDocument()
  })

  it('alt rol decât Admin nu are pagina (trimis la prima lui pagină) și nu o vede în meniu', async () => {
    renderAs(USERS.coordonator, '/utilizatori', { 'GET /api/visits': json(200, []) })

    expect(await screen.findByRole('heading', { name: 'Vizite' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Utilizatori' })).not.toBeInTheDocument()
  })
})
