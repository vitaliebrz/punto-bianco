import { Bed } from '@phosphor-icons/react/Bed'
import { Plus } from '@phosphor-icons/react/Plus'
import { UsersThree } from '@phosphor-icons/react/UsersThree'
import { Van } from '@phosphor-icons/react/Van'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import Button from '../components/Button'
import EmptyState from '../components/EmptyState'
import PageHeader from '../components/PageHeader'
import PageState from '../components/PageState'
import StatusBadge from '../components/StatusBadge'
import { formatDateTime } from '../format'
import { APARTMENT_LABELS, peopleNames, TRANSFER_DIRECTION_LABELS } from '../labels'
import { canAccess, PAGE_ROLES } from '../navigation'
import { isReadOnly } from '../roles'
import { useApiData } from '../useApiData'

// Coloanele tabelului pe ecran lat (xl, de la 1280 px); mai îngust, fiecare vizită e un card
const COLUMNS = 'xl:grid-cols-[minmax(0,1.8fr)_9rem_9rem_minmax(0,1.1fr)_minmax(0,1.3fr)_minmax(0,1fr)_8rem]'

// O valoare din rând: eticheta e vizibilă pe telefon; pe ecran lat o dă antetul tabelului
function Cell({ label, children }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <dt className="text-xs font-medium text-ink-500 xl:sr-only">{label}</dt>
      <dd className="min-w-0 text-[15px] text-ink-800">{children}</dd>
    </div>
  )
}

// „Nu e nevoie” scris discret, ca să iasă în evidență doar ce e nevoie
const notNeeded = <span className="text-ink-500">Nu e nevoie</span>

// Iconiță + text. Textul rămâne în lățimea coloanei și trece pe rândul următor dacă nu încape
// (ex. „2 dormitoare + living”), în loc să se suprapună peste coloana vecină.
function WithIcon({ icon: Icon, children }) {
  return (
    <span className="flex min-w-0 items-start gap-1.5">
      <Icon size={16} aria-hidden="true" className="mt-0.5 shrink-0 text-ink-400" />
      <span className="min-w-0 break-words">{children}</span>
    </span>
  )
}

// Toate vizitele, ordonate după data sosirii (ordinea vine de la server)
export default function VisitsPage() {
  const { user } = useAuth()
  const { data: visits, error, loading, retryable, reload } = useApiData('/api/visits')
  const canCreate = canAccess(user.role, PAGE_ROLES.newVisit)

  return (
    <section className="flex flex-col gap-6">
      <PageHeader
        title="Vizite"
        description="În ordinea datei de sosire."
        readOnly={isReadOnly(user.role)}
        actions={
          canCreate && (
            <Button to="/vizite/noua" icon={Plus}>
              Vizită nouă
            </Button>
          )
        }
      />

      <PageState loading={loading} error={error} onRetry={retryable ? reload : undefined} />

      {visits && visits.length === 0 && (
        <EmptyState
          icon={UsersThree}
          title="Nu există vizite."
          description={canCreate ? 'Înregistrează prima vizită cu butonul „Vizită nouă”.' : undefined}
        />
      )}

      {visits && visits.length > 0 && (
        <div className="overflow-hidden rounded-2xl bg-white shadow-card ring-1 ring-ink-200/60">
          {/* Antetul tabelului (doar pe ecran lat; pentru cititoarele de ecran, fiecare celulă are eticheta ei) */}
          <div
            aria-hidden="true"
            className={`hidden gap-x-5 border-b border-ink-100 bg-ink-50 px-5 py-3 text-[13px] font-medium text-ink-500 xl:grid ${COLUMNS}`}
          >
            <span>Persoane</span>
            <span>Sosire</span>
            <span>Plecare</span>
            <span>Coordonator</span>
            <span>Cazare</span>
            <span>Transfer</span>
            <span className="text-right">Back office</span>
          </div>

          <ul className="divide-y divide-ink-100">
            {visits.map((visit) => (
              <li
                key={visit.id}
                className={`relative grid grid-cols-2 gap-x-5 sm:grid-cols-3 gap-y-3 px-5 py-4 transition-colors hover:bg-mint-50/60 xl:items-center ${COLUMNS}`}
              >
                <div className="col-span-full min-w-0 pr-28 xl:col-span-1 xl:pr-0">
                  {/* Linkul acoperă tot rândul: un clic oriunde deschide detaliile */}
                  <Link
                    to={`/vizite/${visit.id}`}
                    className="font-bold text-ink-900 after:absolute after:inset-0 after:rounded-[inherit] focus:outline-none focus-visible:after:ring-2 focus-visible:after:ring-mint-500 focus-visible:after:ring-inset"
                  >
                    {peopleNames(visit.patients)}
                  </Link>
                </div>

                <dl className="contents">
                  <Cell label="Sosire">{formatDateTime(visit.arrivalAt)}</Cell>
                  <Cell label="Plecare">{formatDateTime(visit.departureAt)}</Cell>
                  <Cell label="Coordonator">
                    <span className="block truncate">{visit.coordinator.fullName}</span>
                  </Cell>
                  <Cell label="Cazare">
                    {visit.accommodation ? (
                      <WithIcon icon={Bed}>{APARTMENT_LABELS[visit.accommodation.apartmentType]}</WithIcon>
                    ) : (
                      notNeeded
                    )}
                  </Cell>
                  <Cell label="Transfer">
                    {visit.transfer ? (
                      <WithIcon icon={Van}>{TRANSFER_DIRECTION_LABELS[visit.transfer.direction]}</WithIcon>
                    ) : (
                      notNeeded
                    )}
                  </Cell>
                </dl>

                {/* Statusul: dreapta-sus pe telefon, ultima coloană pe ecran lat */}
                <div className="absolute top-4 right-5 xl:static xl:flex xl:justify-end">
                  <StatusBadge status={visit.backOfficeStatus} />
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}
