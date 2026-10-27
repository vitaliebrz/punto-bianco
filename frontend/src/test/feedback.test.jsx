// Mesaje pentru utilizator — plan 07, problemele 6 și 7:
// eroarea la „Marchează toate ca citite” și mesajul „Vizita a fost înregistrată” afișat o singură dată.
import { useEffect } from 'react'
import { describe, expect, it } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useLocation } from 'react-router-dom'
import App from '../App'
import AuthProvider from '../auth/AuthProvider'
import { json, mockFetch, renderAs, USERS, VISIT } from './helpers'

describe('clopoțelul: „Marchează toate ca citite” eșuat', () => {
  it('eroarea serverului apare în panou (nu se pierde în consolă)', async () => {
    renderAs(USERS.backoffice, '/back-office', {
      'GET /api/visits': json(200, []),
      'GET /api/notifications': json(200, {
        unreadCount: 1,
        items: [
          {
            id: 1,
            type: 'VIZITA_NOUA_BACK_OFFICE',
            message: 'Vizită nouă: Marco Rossi',
            visitId: 42,
            readAt: null,
            createdAt: '2026-10-26T08:00:00.000Z',
          },
        ],
      }),
      'POST /api/notifications/read-all': json(500, { error: 'Eroare internă' }),
    })
    const user = userEvent.setup()

    await user.click(await screen.findByRole('button', { name: 'Notificări (1 necitite)' }))
    await user.click(screen.getByRole('button', { name: 'Marchează toate ca citite' }))

    const panel = screen.getByRole('dialog', { name: 'Notificări' })
    expect(await within(panel).findByRole('alert')).toHaveTextContent(
      'Notificările nu au putut fi marcate ca citite. Eroare internă',
    )

    // la redeschiderea panoului, mesajul vechi nu mai apare
    await user.click(screen.getByRole('button', { name: /Notificări \(/ }))
    await user.click(screen.getByRole('button', { name: /Notificări \(/ }))
    expect(within(screen.getByRole('dialog', { name: 'Notificări' })).queryByRole('alert')).not.toBeInTheDocument()
  })
})

describe('„Vizita a fost înregistrată” se arată o singură dată', () => {
  it('mesajul apare după înregistrare, iar marcajul e șters din istoric (nu reapare la F5)', async () => {
    localStorage.setItem('pb_token', 'token')
    mockFetch({
      'GET /api/auth/me': json(200, { user: USERS.coordonator }),
      'GET /api/visits/42': json(200, VISIT),
    })
    // ce stare are intrarea curentă din istoric (ce ar primi pagina la un F5)
    const history = { state: 'necitit' }
    function LocationProbe() {
      const { state } = useLocation()
      useEffect(() => {
        history.state = state
      }, [state])
      return null
    }

    render(
      <MemoryRouter initialEntries={[{ pathname: '/vizite/42', state: { created: true } }]}>
        <AuthProvider>
          <App />
          <LocationProbe />
        </AuthProvider>
      </MemoryRouter>,
    )

    expect(await screen.findByText('Vizita a fost înregistrată, echipa a fost anunțată.')).toBeInTheDocument()
    // starea din istoric (ce ar vedea un F5) nu mai conține marcajul
    await waitFor(() => expect(history.state).toBeNull())
    // dar mesajul rămâne pe ecran cât utilizatorul e pe pagină
    expect(screen.getByText('Vizita a fost înregistrată, echipa a fost anunțată.')).toBeInTheDocument()
  })
})
