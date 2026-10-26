import { useLocation, useNavigate, useParams } from 'react-router-dom'
import PageState from '../components/PageState'
import StatusBadge from '../components/StatusBadge'
import { formatDateTime } from '../format'
import { APARTMENT_LABELS, fullName, TRANSFER_DIRECTION_LABELS } from '../labels'
import { useApiData } from '../useApiData'

const freeLabel = (isFree) => (isFree ? 'Gratuit' : 'Contra cost')

export default function VisitDetailsPage() {
  const { id } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const { data: visit, error, loading, reload } = useApiData(`/api/visits/${id}`)
  // Mesajul de după înregistrare (vine din formular)
  const justCreated = location.state?.created === true

  return (
    <section className="page">
      <div className="page-header">
        <h1>Detalii vizită</h1>
        <button type="button" className="btn btn-secondary" onClick={() => navigate(-1)}>
          Înapoi
        </button>
      </div>

      {justCreated && (
        <p className="alert-success" role="status">
          Vizita a fost înregistrată, echipa a fost anunțată.
        </p>
      )}

      <PageState loading={loading} error={error} onRetry={reload} />

      {visit && (
        <div className="details">
          <section className="card">
            <h2>Persoane</h2>
            {visit.patients.map((person) => (
              <dl key={person.id} className="card-details person">
                <div>
                  <dt>{person.isCompanion ? 'Însoțitor' : 'Pacient'}</dt>
                  <dd>
                    <strong>{fullName(person)}</strong>
                  </dd>
                </div>
                <div>
                  <dt>Tratament</dt>
                  <dd>{person.treatment ?? 'Fără tratament'}</dd>
                </div>
                <div>
                  <dt>Disponibilitate</dt>
                  <dd>{person.availability ?? '—'}</dd>
                </div>
              </dl>
            ))}
          </section>

          <section className="card">
            <h2>Sejur</h2>
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
                <dt>Coordonator responsabil</dt>
                <dd>{visit.coordinator.fullName}</dd>
              </div>
            </dl>
          </section>

          <section className="card">
            <h2>Cazare</h2>
            {visit.accommodation ? (
              <dl className="card-details">
                <div>
                  <dt>Apartament</dt>
                  <dd>{APARTMENT_LABELS[visit.accommodation.apartmentType]}</dd>
                </div>
                <div>
                  <dt>Cost</dt>
                  <dd>
                    {visit.accommodation.isFree
                      ? `Gratuită ${visit.accommodation.freeDays} ${visit.accommodation.freeDays === 1 ? 'zi' : 'zile'}`
                      : 'Contra cost'}
                  </dd>
                </div>
                <div>
                  <dt>Status</dt>
                  <dd>
                    <StatusBadge status={visit.accommodation.status} />
                  </dd>
                </div>
              </dl>
            ) : (
              <p className="muted">Nu e nevoie de cazare.</p>
            )}
          </section>

          <section className="card">
            <h2>Transfer</h2>
            {visit.transfer ? (
              <dl className="card-details">
                <div>
                  <dt>Direcție</dt>
                  <dd>{TRANSFER_DIRECTION_LABELS[visit.transfer.direction]}</dd>
                </div>
                <div>
                  <dt>Cost</dt>
                  <dd>{freeLabel(visit.transfer.isFree)}</dd>
                </div>
              </dl>
            ) : (
              <p className="muted">Nu e nevoie de transfer.</p>
            )}
          </section>

          <section className="card">
            <h2>Back office</h2>
            <dl className="card-details">
              <div>
                <dt>Status</dt>
                <dd>
                  <StatusBadge status={visit.backOfficeStatus} />
                </dd>
              </div>
              {visit.backOfficeStartedAt && (
                <div>
                  <dt>Început</dt>
                  <dd>{formatDateTime(visit.backOfficeStartedAt)}</dd>
                </div>
              )}
              {visit.backOfficeFinishedAt && (
                <div>
                  <dt>Finalizat</dt>
                  <dd>{formatDateTime(visit.backOfficeFinishedAt)}</dd>
                </div>
              )}
            </dl>
          </section>
        </div>
      )}
    </section>
  )
}
