// Meniul și prima pagină pentru fiecare rol, clopoțelul de notificări, textul din calendar.
import { describe, expect, it, vi } from 'vitest'
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { menuFor } from '../navigation'
import { transferEventTitle } from '../transferEvents'
import { json, renderAs, USERS, VISIT } from './helpers'

const NOTIFICATIONS = {
  unreadCount: 1,
  items: [
    {
      id: 11,
      type: 'VIZITA_NOUA_BACK_OFFICE',
      message: 'Vizită nouă: Marco Rossi, sosire 02.11.2026 14:30',
      visitId: 42,
      readAt: null,
      createdAt: '2026-10-26T10:00:00.000Z',
    },
    {
      id: 10,
      type: 'VIZITA_NOUA_BACK_OFFICE',
      message: 'Vizită nouă: Sophie Martin, sosire 28.10.2026 14:30',
      visitId: 41,
      readAt: '2026-10-25T09:00:00.000Z',
      createdAt: '2026-10-25T08:00:00.000Z',
    },
  ],
}

const menuLabels = (role) => menuFor(role).map((item) => item.label)

describe('meniul pe roluri', () => {
  it.each([
    ['ADMIN', ['Vizite', 'Vizită nouă', 'Back office', 'Cazări', 'Calendar transferuri']],
    ['COORDONATOR', ['Vizite', 'Vizită nouă']],
    ['BACK_OFFICE', ['Back office']],
    ['MANAGER_CAZARI', ['Cazări']],
    ['SOFER', ['Calendar transferuri']],
    ['CONTABIL', ['Vizite', 'Back office', 'Cazări', 'Calendar transferuri']],
    ['CONTROL_CALITATE', ['Vizite', 'Back office', 'Cazări', 'Calendar transferuri']],
  ])('%s vede: %j', (role, labels) => {
    expect(menuLabels(role)).toEqual(labels)
  })

  it.each([
    ['Vizite', USERS.coordonator, { 'GET /api/visits': json(200, []) }],
    ['Back office', USERS.backoffice, { 'GET /api/visits': json(200, []) }],
    ['Cazări', USERS.cazari, { 'GET /api/accommodations': json(200, []) }],
    ['Calendar transferuri', USERS.sofer, { 'GET /api/transfers': json(200, []) }],
  ])('după login ajunge direct pe pagina „%s”', async (heading, user, routes) => {
    renderAs(user, '/', {
      'GET /api/notifications': json(200, { unreadCount: 0, items: [] }),
      ...routes,
    })
    expect(await screen.findByRole('heading', { name: heading })).toBeInTheDocument()
    // meniul conține doar paginile rolului
    const menu = screen.getByRole('navigation', { name: 'Meniu' })
    expect(within(menu).getAllByRole('link').map((link) => link.textContent)).toEqual(
      menuLabels(user.role),
    )
  })
})

describe('derularea la schimbarea paginii', () => {
  it('pagina nouă se deschide de sus, nu de unde rămăsese pagina anterioară', async () => {
    const scrollTo = vi.spyOn(window, 'scrollTo')
    renderAs(USERS.coordonator, '/vizite', {
      'GET /api/visits': json(200, []),
      'GET /api/users/coordinators': json(200, []),
    })
    await screen.findByRole('heading', { name: 'Vizite' })
    scrollTo.mockClear()

    const menu = screen.getByRole('navigation', { name: 'Meniu' })
    await userEvent.setup().click(within(menu).getByRole('link', { name: 'Vizită nouă' }))

    expect(await screen.findByRole('heading', { name: 'Vizită nouă' })).toBeInTheDocument()
    expect(scrollTo).toHaveBeenCalledWith(0, 0)
  })
})

describe('clopoțelul de notificări', () => {
  it('apare doar pentru Back office și Manager cazări', async () => {
    renderAs(USERS.coordonator, '/vizite', { 'GET /api/visits': json(200, []) })
    expect(await screen.findByRole('heading', { name: 'Vizite' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Notificări/ })).not.toBeInTheDocument()
  })

  it('arată numărul celor necitite și lista, cu cele necitite evidențiate', async () => {
    renderAs(USERS.backoffice, '/back-office', {
      'GET /api/visits': json(200, []),
      'GET /api/notifications': json(200, NOTIFICATIONS),
    })

    const bell = await screen.findByRole('button', { name: 'Notificări (1 necitite)' })
    expect(within(bell).getByText('1')).toBeInTheDocument()

    await userEvent.setup().click(bell)
    const panel = screen.getByRole('dialog', { name: 'Notificări' })
    const items = within(panel).getAllByRole('button', { name: /Vizită nouă/ })
    expect(items).toHaveLength(2)
    expect(items[0]).toHaveAttribute('data-unread', 'true')
    expect(items[1]).toHaveAttribute('data-unread', 'false')
  })

  it('clic pe o notificare necitită: o marchează citită și deschide vizita', async () => {
    let read = false
    const fetchMock = renderAs(USERS.cazari, '/cazari', {
      'GET /api/accommodations': json(200, []),
      'GET /api/visits/42': json(200, VISIT),
      'GET /api/notifications': () =>
        json(200, {
          unreadCount: read ? 0 : 1,
          items: [{ ...NOTIFICATIONS.items[0], type: 'CAZARE_NOUA', readAt: read ? 'acum' : null }],
        }),
      'PATCH /api/notifications/11/read': () => {
        read = true
        return { ok: true, status: 204, json: async () => null }
      },
    })
    const user = userEvent.setup()

    await user.click(await screen.findByRole('button', { name: 'Notificări (1 necitite)' }))
    await user.click(screen.getByRole('button', { name: /Vizită nouă: Marco Rossi/ }))

    expect(await screen.findByRole('button', { name: 'Notificări (0 necitite)' })).toBeInTheDocument()
    expect(await screen.findByRole('heading', { name: 'Detalii vizită' })).toBeInTheDocument()
    expect(await screen.findByText('Implant')).toBeInTheDocument()
    expect(fetchMock.mock.calls.some(([, o]) => o?.method === 'PATCH')).toBe(true)
  })

  it('Back office: clic pe notificare când ești deja pe pagina ta deschide tot vizita', async () => {
    renderAs(USERS.backoffice, '/back-office', {
      'GET /api/visits': json(200, [VISIT]),
      'GET /api/visits/42': json(200, VISIT),
      'GET /api/notifications': json(200, { ...NOTIFICATIONS, unreadCount: 0, items: [NOTIFICATIONS.items[1]] }),
    })
    const user = userEvent.setup()

    await user.click(await screen.findByRole('button', { name: 'Notificări (0 necitite)' }))
    await user.click(screen.getByRole('button', { name: /Sophie Martin/ }))

    expect(await screen.findByRole('heading', { name: 'Detalii vizită' })).toBeInTheDocument()
  })

  it('„Marchează toate ca citite”', async () => {
    let allRead = false
    renderAs(USERS.backoffice, '/back-office', {
      'GET /api/visits': json(200, []),
      'GET /api/notifications': () =>
        json(200, allRead ? { unreadCount: 0, items: [] } : NOTIFICATIONS),
      'POST /api/notifications/read-all': () => {
        allRead = true
        return json(200, { updated: 1 })
      },
    })
    const user = userEvent.setup()

    await user.click(await screen.findByRole('button', { name: 'Notificări (1 necitite)' }))
    await user.click(screen.getByRole('button', { name: 'Marchează toate ca citite' }))

    expect(await screen.findByRole('button', { name: 'Notificări (0 necitite)' })).toBeInTheDocument()
  })
})

describe('textul din calendar', () => {
  it('Sosire: „Sosire HH:MM – nume”, în ora Chișinăului', () => {
    expect(
      transferEventTitle({ kind: 'SOSIRE', at: '2026-11-02T12:30:00.000Z', names: ['Marco Rossi'] }),
    ).toBe('Sosire 14:30 – Marco Rossi')
  })

  it('Plecare cu doi pacienți, vara (UTC+3)', () => {
    expect(
      transferEventTitle({
        kind: 'PLECARE',
        at: '2026-07-10T07:00:00.000Z',
        names: ['Anna Schmidt', 'Thomas Schmidt'],
      }),
    ).toBe('Plecare 10:00 – Anna Schmidt, Thomas Schmidt')
  })
})
