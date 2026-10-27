// Date vechi pe ecran (useApiData) și deconectări întârziate (apiFetch) — plan 07, problemele 3 și 4.
import { describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { apiFetch, ApiError, SESSION_EXPIRED_EVENT, tokenStorage } from '../api'
import { json, mockFetch, renderAs, USERS, VISIT } from './helpers'

// Un răspuns pe care testul îl trimite când vrea (ca un server lent)
function deferred() {
  let resolve
  const promise = new Promise((done) => {
    resolve = done
  })
  return { promise, resolve }
}

describe('useApiData: fără date vechi pe ecran', () => {
  it('trecerea de la vizita 42 la vizita 43 nu mai arată vizita 42 cât se încarcă', async () => {
    const otherVisit = {
      ...VISIT,
      id: 43,
      patients: [{ ...VISIT.patients[0], id: 9, firstName: 'Sophie', lastName: 'Martin', treatment: 'Albire' }],
    }
    const slow = deferred()
    renderAs(USERS.backoffice, '/vizite/42', {
      'GET /api/visits/42': json(200, VISIT),
      'GET /api/visits/43': () => slow.promise,
      'GET /api/notifications': json(200, {
        unreadCount: 0,
        items: [
          {
            id: 1,
            type: 'VIZITA_NOUA_BACK_OFFICE',
            message: 'Vizită nouă: Sophie Martin',
            visitId: 43,
            readAt: '2026-10-25T09:00:00.000Z',
            createdAt: '2026-10-25T08:00:00.000Z',
          },
        ],
      }),
    })
    const user = userEvent.setup()
    expect(await screen.findByText('Implant')).toBeInTheDocument()

    // din clopoțel, la altă vizită (aceeași pagină, altă adresă)
    await user.click(screen.getByRole('button', { name: /Notificări/ }))
    await user.click(screen.getByRole('button', { name: /Sophie Martin/ }))

    // cât răspunde serverul: nimic din vizita 42, ci „se încarcă”
    expect(await screen.findByText('Se încarcă…')).toBeInTheDocument()
    expect(screen.queryByText('Implant')).not.toBeInTheDocument()

    slow.resolve(json(200, otherVisit))
    expect(await screen.findByText('Albire')).toBeInTheDocument()
  })

  it('„Reîncearcă” după o eroare arată din nou „se încarcă”, nu eroarea veche', async () => {
    let calls = 0
    const slow = deferred()
    renderAs(USERS.coordonator, '/vizite', {
      'GET /api/visits': () => {
        calls += 1
        return calls === 1 ? json(500, { error: 'Eroare internă' }) : slow.promise
      },
    })

    expect(await screen.findByRole('alert')).toHaveTextContent('Eroare internă')
    await userEvent.setup().click(screen.getByRole('button', { name: 'Reîncearcă' }))

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.getByText('Se încarcă…')).toBeInTheDocument()

    slow.resolve(json(200, [VISIT]))
    expect(await screen.findByText('Marco Rossi, Anna Rossi')).toBeInTheDocument()
  })
})

describe('apiFetch: un 401 întârziat nu deconectează o sesiune nouă', () => {
  it('cererea plecată cu tokenul vechi primește 401 după reconectare: tokenul nou rămâne', async () => {
    const slow = deferred()
    mockFetch({ 'GET /api/notifications': () => slow.promise })
    const onExpired = vi.fn()
    window.addEventListener(SESSION_EXPIRED_EVENT, onExpired)

    tokenStorage.set('token-vechi')
    const pending = apiFetch('/api/notifications')
    tokenStorage.set('token-nou') // utilizatorul s-a reconectat între timp
    slow.resolve(json(401, { error: 'Sesiune invalidă sau expirată' }))

    await expect(pending).rejects.toBeInstanceOf(ApiError)
    expect(tokenStorage.get()).toBe('token-nou')
    expect(onExpired).not.toHaveBeenCalled()
    window.removeEventListener(SESSION_EXPIRED_EVENT, onExpired)
  })

  it('401 pentru tokenul curent: sesiunea se închide (ca înainte)', async () => {
    mockFetch({ 'GET /api/notifications': json(401, { error: 'Sesiune invalidă sau expirată' }) })
    const onExpired = vi.fn()
    window.addEventListener(SESSION_EXPIRED_EVENT, onExpired)

    tokenStorage.set('token-curent')
    await expect(apiFetch('/api/notifications')).rejects.toMatchObject({ status: 401 })
    expect(tokenStorage.get()).toBeNull()
    expect(onExpired).toHaveBeenCalledTimes(1)
    window.removeEventListener(SESSION_EXPIRED_EVENT, onExpired)
  })
})
