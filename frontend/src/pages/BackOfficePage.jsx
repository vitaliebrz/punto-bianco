import { useState } from 'react'
import { Link } from 'react-router-dom'
import { apiFetch } from '../api'
import { useAuth } from '../auth/useAuth'
import PageState from '../components/PageState'
import StatusBadge from '../components/StatusBadge'
import { formatDateTime } from '../format'
import { fullName, peopleNames } from '../labels'
import { isReadOnly } from '../roles'
import { useApiData } from '../useApiData'

// Butonul care apare pentru fiecare status: NEPRELUAT -> „Început”, INCEPUT -> „Finalizat”
const NEXT_ACTION = {
  NEPRELUAT: { status: 'INCEPUT', label: 'Început' },
  INCEPUT: { status: 'FINALIZAT', label: 'Finalizat' },
}

// Pasul 2 din cerință: lista Back office, ordonată după data sosirii
export default function BackOfficePage() {
  const { user } = useAuth()
  const readOnly = isReadOnly(user.role)
  const { data: visits, error, loading, reload, setData } = useApiData('/api/visits')
  const [busyId, setBusyId] = useState(null)
  const [actionError, setActionError] = useState('')

  async function changeStatus(visit, status) {
    setBusyId(visit.id)
    setActionError('')
    try {
      const updated = await apiFetch(`/api/visits/${visit.id}/back-office-status`, {
        method: 'PATCH',
        body: { status },
      })
      setData((list) => list.map((item) => (item.id === updated.id ? updated : item)))
    } catch (err) {
      setActionError(err.message)
      // 409 = altcineva a schimbat deja statusul: arătăm starea reală
      if (err.status === 409) reload()
    } finally {
      setBusyId(null)
    }
  }

  return (
    <section className="page">
      <div className="page-header">
        <h1>Back office</h1>
      </div>
      {readOnly && <p className="readonly-note">Doar vizualizare.</p>}

      {actionError && (
        <p className="alert-error" role="alert">
          {actionError}
        </p>
      )}

      <PageState loading={loading} error={error} onRetry={reload} />

      {visits && visits.length === 0 && <p className="page-status">Nu există pacienți.</p>}

      {visits && visits.length > 0 && (
        <ul className="card-list">
          {visits.map((visit) => {
            const action = NEXT_ACTION[visit.backOfficeStatus]
            return (
              <li key={visit.id} className="card">
                <div className="card-header">
                  <Link to={`/vizite/${visit.id}`} className="card-title">
                    {peopleNames(visit.patients)}
                  </Link>
                  <StatusBadge status={visit.backOfficeStatus} />
                </div>

                <dl className="card-details">
                  <div>
                    <dt>Sosire</dt>
                    <dd>{formatDateTime(visit.arrivalAt)}</dd>
                  </div>
                  <div>
                    <dt>Plecare</dt>
                    <dd>{formatDateTime(visit.departureAt)}</dd>
                  </div>
                  <div>
                    <dt>Coordonator</dt>
                    <dd>{visit.coordinator.fullName}</dd>
                  </div>
                </dl>

                {visit.patients
                  .filter((person) => person.treatment)
                  .map((person) => (
                    <dl key={person.id} className="card-details person">
                      <div>
                        <dt>Tratament – {fullName(person)}</dt>
                        <dd>{person.treatment}</dd>
                      </div>
                      <div>
                        <dt>Disponibilitate</dt>
                        <dd>{person.availability ?? '—'}</dd>
                      </div>
                    </dl>
                  ))}

                {!readOnly && action && (
                  <div className="card-actions">
                    <button
                      type="button"
                      className="btn btn-primary"
                      disabled={busyId === visit.id}
                      onClick={() => changeStatus(visit, action.status)}
                    >
                      {busyId === visit.id ? 'Se salvează…' : action.label}
                    </button>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
