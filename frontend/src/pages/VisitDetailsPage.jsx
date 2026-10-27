import { AirplaneLanding } from '@phosphor-icons/react/AirplaneLanding'
import { AirplaneTakeoff } from '@phosphor-icons/react/AirplaneTakeoff'
import { ArrowLeft } from '@phosphor-icons/react/ArrowLeft'
import { Bed } from '@phosphor-icons/react/Bed'
import { CalendarBlank } from '@phosphor-icons/react/CalendarBlank'
import { CheckCircle } from '@phosphor-icons/react/CheckCircle'
import { ClipboardText } from '@phosphor-icons/react/ClipboardText'
import { UsersThree } from '@phosphor-icons/react/UsersThree'
import { Van } from '@phosphor-icons/react/Van'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import Button from '../components/Button'
import PageHeader from '../components/PageHeader'
import PageState from '../components/PageState'
import Panel, { Detail } from '../components/Panel'
import Skeleton from '../components/Skeleton'
import StatusBadge from '../components/StatusBadge'
import { formatDateTime } from '../format'
import { APARTMENT_LABELS, fullName, TRANSFER_DIRECTION_LABELS } from '../labels'
import { useApiData } from '../useApiData'

const freeLabel = (isFree) => (isFree ? 'Gratuit' : 'Contra cost')

const initials = (person) => `${person.firstName[0] ?? ''}${person.lastName[0] ?? ''}`.toUpperCase()

// Scheletul paginii cât se încarcă datele
const detailsSkeleton = (
  <div className="grid gap-5 lg:grid-cols-3">
    <div className="flex flex-col gap-5 lg:col-span-2">
      <Skeleton className="h-56 rounded-2xl" />
      <Skeleton className="h-36 rounded-2xl" />
    </div>
    <div className="flex flex-col gap-5">
      <Skeleton className="h-36 rounded-2xl" />
      <Skeleton className="h-28 rounded-2xl" />
      <Skeleton className="h-28 rounded-2xl" />
    </div>
  </div>
)

export default function VisitDetailsPage() {
  const { id } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const { data: visit, error, loading, reload } = useApiData(`/api/visits/${id}`)
  // Mesajul de după înregistrare (vine din formular)
  const justCreated = location.state?.created === true

  return (
    <section className="flex flex-col gap-6">
      <div>
        <Button variant="ghost" size="sm" icon={ArrowLeft} className="-ml-2" onClick={() => navigate(-1)}>
          Înapoi
        </Button>
      </div>

      <PageHeader title="Detalii vizită" />

      {justCreated && (
        <p
          role="status"
          className="flex items-center gap-2.5 rounded-xl bg-mint-100 px-4 py-3 text-[15px] font-medium text-mint-900 ring-1 ring-mint-200 ring-inset"
        >
          <CheckCircle size={20} weight="fill" aria-hidden="true" className="shrink-0 text-mint-600" />
          Vizita a fost înregistrată, echipa a fost anunțată.
        </p>
      )}

      <PageState loading={loading} error={error} onRetry={reload} skeleton={detailsSkeleton} />

      {visit && (
        <div className="grid items-start gap-5 lg:grid-cols-3">
          <div className="flex flex-col gap-5 lg:col-span-2">
            <Panel icon={UsersThree} title="Persoane">
              <ul className="flex flex-col divide-y divide-ink-100">
                {visit.patients.map((person) => (
                  <li key={person.id} className="flex flex-col gap-4 py-4 first:pt-0 last:pb-0">
                    <div className="flex items-center gap-3">
                      <span
                        aria-hidden="true"
                        className="flex size-10 shrink-0 items-center justify-center rounded-full bg-mint-100 text-sm font-bold text-mint-800"
                      >
                        {initials(person)}
                      </span>
                      <div className="flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-1">
                        <p className="text-[17px] font-bold text-ink-900">{fullName(person)}</p>
                        <span className="rounded-full bg-ink-100 px-2.5 py-0.5 text-[13px] font-medium text-ink-600">
                          {person.isCompanion ? 'Însoțitor' : 'Pacient'}
                        </span>
                      </div>
                    </div>
                    <dl className="grid gap-4 sm:grid-cols-2">
                      <Detail label="Tratament">
                        {person.treatment ?? <span className="text-ink-400">Fără tratament</span>}
                      </Detail>
                      <Detail label="Disponibilitate">
                        {person.availability ?? <span className="text-ink-400">Necompletat</span>}
                      </Detail>
                    </dl>
                  </li>
                ))}
              </ul>
            </Panel>

            <Panel icon={CalendarBlank} title="Sejur">
              <dl className="grid gap-4 sm:grid-cols-3">
                <Detail label="Sosire">
                  <span className="inline-flex items-center gap-1.5">
                    <AirplaneLanding size={16} aria-hidden="true" className="text-ink-400" />
                    {formatDateTime(visit.arrivalAt)}
                  </span>
                </Detail>
                <Detail label="Plecare">
                  <span className="inline-flex items-center gap-1.5">
                    <AirplaneTakeoff size={16} aria-hidden="true" className="text-ink-400" />
                    {formatDateTime(visit.departureAt)}
                  </span>
                </Detail>
                <Detail label="Coordonator responsabil">{visit.coordinator.fullName}</Detail>
              </dl>
            </Panel>
          </div>

          <div className="flex flex-col gap-5">
            <Panel
              icon={Bed}
              title="Cazare"
              actions={visit.accommodation && <StatusBadge status={visit.accommodation.status} />}
            >
              {visit.accommodation ? (
                <dl className="grid grid-cols-2 gap-4">
                  <Detail label="Apartament">{APARTMENT_LABELS[visit.accommodation.apartmentType]}</Detail>
                  <Detail label="Cost">
                    {visit.accommodation.isFree
                      ? `Gratuită ${visit.accommodation.freeDays} ${visit.accommodation.freeDays === 1 ? 'zi' : 'zile'}`
                      : 'Contra cost'}
                  </Detail>
                </dl>
              ) : (
                <p className="text-[15px] text-ink-500">Nu e nevoie de cazare.</p>
              )}
            </Panel>

            <Panel icon={Van} title="Transfer">
              {visit.transfer ? (
                <dl className="grid grid-cols-2 gap-4">
                  <Detail label="Direcție">{TRANSFER_DIRECTION_LABELS[visit.transfer.direction]}</Detail>
                  <Detail label="Cost">{freeLabel(visit.transfer.isFree)}</Detail>
                </dl>
              ) : (
                <p className="text-[15px] text-ink-500">Nu e nevoie de transfer.</p>
              )}
            </Panel>

            <Panel icon={ClipboardText} title="Back office" actions={<StatusBadge status={visit.backOfficeStatus} />}>
              {visit.backOfficeStartedAt || visit.backOfficeFinishedAt ? (
                <dl className="grid grid-cols-2 gap-4">
                  {visit.backOfficeStartedAt && (
                    <Detail label="Început">{formatDateTime(visit.backOfficeStartedAt)}</Detail>
                  )}
                  {visit.backOfficeFinishedAt && (
                    <Detail label="Finalizat">{formatDateTime(visit.backOfficeFinishedAt)}</Detail>
                  )}
                </dl>
              ) : (
                <p className="text-[15px] text-ink-500">Cazul nu a fost preluat încă.</p>
              )}
            </Panel>
          </div>
        </div>
      )}
    </section>
  )
}
