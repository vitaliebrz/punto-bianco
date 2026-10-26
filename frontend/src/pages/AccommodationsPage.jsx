import { useState } from 'react'
import { Link } from 'react-router-dom'
import { apiFetch } from '../api'
import { useAuth } from '../auth/useAuth'
import PageState from '../components/PageState'
import StatusBadge from '../components/StatusBadge'
import { formatDateTime } from '../format'
import { APARTMENT_LABELS, peopleNames } from '../labels'
import { isReadOnly } from '../roles'
import { useApiData } from '../useApiData'

const costLabel = ({ isFree, freeDays }) =>
  isFree ? `Gratuită ${freeDays} ${freeDays === 1 ? 'zi' : 'zile'}` : 'Contra cost'

// Pasul 2 din cerință: cererile de cazare stau „Neprelucrat” până se marchează „Rezervat”
export default function AccommodationsPage() {
  const { user } = useAuth()
  const readOnly = isReadOnly(user.role)
  const { data: requests, error, loading, reload, setData } = useApiData('/api/accommodations')
  const [busyId, setBusyId] = useState(null)
  const [actionError, setActionError] = useState('')

  async function markReserved(request) {
    setBusyId(request.id)
    setActionError('')
    try {
      const updated = await apiFetch(`/api/accommodations/${request.id}/status`, {
        method: 'PATCH',
        body: { status: 'REZERVAT' },
      })
      setData((list) => list.map((item) => (item.id === updated.id ? updated : item)))
    } catch (err) {
      setActionError(err.message)
      // 409 = cererea a fost deja rezervată de altcineva: arătăm starea reală
      if (err.status === 409) reload()
    } finally {
      setBusyId(null)
    }
  }

  return (
    <section className="page">
      <div className="page-header">
        <h1>Cazări</h1>
      </div>
      {readOnly && <p className="readonly-note">Doar vizualizare.</p>}

      {actionError && (
        <p className="alert-error" role="alert">
          {actionError}
        </p>
      )}

      <PageState loading={loading} error={error} onRetry={reload} />

      {requests && requests.length === 0 && <p className="page-status">Nu există cereri de cazare.</p>}

      {requests && requests.length > 0 && (
        <ul className="card-list">
          {requests.map((request) => (
            <li key={request.id} className="card">
              <div className="card-header">
                <Link to={`/vizite/${request.visit.id}`} className="card-title">
                  {peopleNames(request.visit.patients)}
                </Link>
                <StatusBadge status={request.status} />
              </div>

              <dl className="card-details">
                <div>
                  <dt>Apartament</dt>
                  <dd>{APARTMENT_LABELS[request.apartmentType]}</dd>
                </div>
                <div>
                  <dt>Cost</dt>
                  <dd>{costLabel(request)}</dd>
                </div>
                <div>
                  <dt>Sosire</dt>
                  <dd>{formatDateTime(request.visit.arrivalAt)}</dd>
                </div>
                <div>
                  <dt>Plecare</dt>
                  <dd>{formatDateTime(request.visit.departureAt)}</dd>
                </div>
                <div>
                  <dt>Coordonator</dt>
                  <dd>{request.visit.coordinator.fullName}</dd>
                </div>
                {request.reservedAt && (
                  <div>
                    <dt>Rezervat la</dt>
                    <dd>{formatDateTime(request.reservedAt)}</dd>
                  </div>
                )}
              </dl>

              {!readOnly && request.status === 'NEPRELUCRAT' && (
                <div className="card-actions">
                  <button
                    type="button"
                    className="btn btn-primary"
                    disabled={busyId === request.id}
                    onClick={() => markReserved(request)}
                  >
                    {busyId === request.id ? 'Se salvează…' : 'Marchează rezervat'}
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
