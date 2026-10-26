import { Link } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import PageState from '../components/PageState'
import StatusBadge from '../components/StatusBadge'
import { formatDateTime } from '../format'
import { APARTMENT_LABELS, peopleNames, TRANSFER_DIRECTION_LABELS } from '../labels'
import { canAccess, PAGE_ROLES } from '../navigation'
import { isReadOnly } from '../roles'
import { useApiData } from '../useApiData'

// Toate vizitele, ordonate după data sosirii (ordinea vine de la server)
export default function VisitsPage() {
  const { user } = useAuth()
  const { data: visits, error, loading, reload } = useApiData('/api/visits')

  return (
    <section className="page">
      <div className="page-header">
        <h1>Vizite</h1>
        {canAccess(user.role, PAGE_ROLES.newVisit) && (
          <Link to="/vizite/noua" className="btn btn-primary">
            Vizită nouă
          </Link>
        )}
      </div>
      {isReadOnly(user.role) && <p className="readonly-note">Doar vizualizare.</p>}

      <PageState loading={loading} error={error} onRetry={reload} />

      {visits && visits.length === 0 && <p className="page-status">Nu există vizite.</p>}

      {visits && visits.length > 0 && (
        <ul className="card-list">
          {visits.map((visit) => (
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
                <div>
                  <dt>Cazare</dt>
                  <dd>
                    {visit.accommodation
                      ? APARTMENT_LABELS[visit.accommodation.apartmentType]
                      : 'Nu e nevoie'}
                  </dd>
                </div>
                <div>
                  <dt>Transfer</dt>
                  <dd>
                    {visit.transfer ? TRANSFER_DIRECTION_LABELS[visit.transfer.direction] : 'Nu e nevoie'}
                  </dd>
                </div>
              </dl>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
