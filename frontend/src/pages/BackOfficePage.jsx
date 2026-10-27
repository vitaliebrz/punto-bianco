import { useState } from 'react'
import { AirplaneLanding } from '@phosphor-icons/react/AirplaneLanding'
import { AirplaneTakeoff } from '@phosphor-icons/react/AirplaneTakeoff'
import { CheckCircle } from '@phosphor-icons/react/CheckCircle'
import { CircleNotch } from '@phosphor-icons/react/CircleNotch'
import { ClipboardText } from '@phosphor-icons/react/ClipboardText'
import { Clock } from '@phosphor-icons/react/Clock'
import { IdentificationBadge } from '@phosphor-icons/react/IdentificationBadge'
import { Play } from '@phosphor-icons/react/Play'
import { Link } from 'react-router-dom'
import { apiFetch } from '../api'
import { useAuth } from '../auth/useAuth'
import Button from '../components/Button'
import EmptyState from '../components/EmptyState'
import Meta from '../components/Meta'
import PageHeader from '../components/PageHeader'
import PageState, { ErrorState } from '../components/PageState'
import StatusBadge from '../components/StatusBadge'
import StatusSummary from '../components/StatusSummary'
import { formatDateTime } from '../format'
import { countByStatus, fullName, peopleNames } from '../labels'
import { isReadOnly } from '../roles'
import { useApiData } from '../useApiData'

// Butonul care apare pentru fiecare status: NEPRELUAT -> „Început”, INCEPUT -> „Finalizat”
const NEXT_ACTION = {
  NEPRELUAT: { status: 'INCEPUT', label: 'Început', icon: Play },
  INCEPUT: { status: 'FINALIZAT', label: 'Finalizat', icon: CheckCircle },
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

  const counts = countByStatus(visits ?? [], (visit) => visit.backOfficeStatus)

  return (
    <section className="flex flex-col gap-6">
      <PageHeader title="Back office" description="Pacienții în ordinea datei de sosire." readOnly={readOnly} />

      {visits && visits.length > 0 && (
        <StatusSummary
          items={[
            { label: 'Nepreluat', count: counts.NEPRELUAT ?? 0, tone: 'todo' },
            { label: 'Început', count: counts.INCEPUT ?? 0, tone: 'progress' },
            { label: 'Finalizat', count: counts.FINALIZAT ?? 0, tone: 'done' },
          ]}
        />
      )}

      {actionError && <ErrorState message={actionError} />}

      <PageState loading={loading} error={error} onRetry={reload} />

      {visits && visits.length === 0 && (
        <EmptyState
          icon={ClipboardText}
          title="Nu există pacienți."
          description="Vizitele înregistrate de coordonatori apar aici automat."
        />
      )}

      {visits && visits.length > 0 && (
        <ul className="flex flex-col gap-3">
          {visits.map((visit) => {
            const action = NEXT_ACTION[visit.backOfficeStatus]
            const busy = busyId === visit.id
            const treated = visit.patients.filter((person) => person.treatment)
            return (
              <li
                key={visit.id}
                className="flex flex-col gap-4 rounded-2xl bg-white p-5 shadow-card ring-1 ring-ink-200/60 md:flex-row md:gap-6"
              >
                <div className="flex min-w-0 flex-1 flex-col gap-4">
                  <Link
                    to={`/vizite/${visit.id}`}
                    className="self-start rounded text-[17px] font-bold text-ink-900 hover:text-mint-700 focus-visible:ring-2 focus-visible:ring-mint-500 focus-visible:outline-none"
                  >
                    {peopleNames(visit.patients)}
                  </Link>

                  <dl className="flex flex-wrap gap-x-6 gap-y-2">
                    <Meta icon={AirplaneLanding} label="Sosire">
                      {formatDateTime(visit.arrivalAt)}
                    </Meta>
                    <Meta icon={AirplaneTakeoff} label="Plecare">
                      {formatDateTime(visit.departureAt)}
                    </Meta>
                    <Meta icon={IdentificationBadge} label="Coordonator">
                      {visit.coordinator.fullName}
                    </Meta>
                  </dl>

                  {treated.length > 0 && (
                    <div className="grid gap-2.5 sm:grid-cols-2">
                      {treated.map((person) => (
                        <dl key={person.id} className="flex flex-col gap-2 rounded-xl bg-ink-50 p-3.5 ring-1 ring-ink-100">
                          <div className="flex flex-col gap-0.5">
                            <dt className="text-[13px] font-medium text-ink-500">Tratament – {fullName(person)}</dt>
                            <dd className="text-[15px] whitespace-pre-line text-ink-900">{person.treatment}</dd>
                          </div>
                          <div className="flex items-start gap-1.5 text-sm text-ink-600">
                            <Clock size={16} aria-hidden="true" className="mt-0.5 shrink-0 text-ink-400" />
                            <dt className="sr-only">Disponibilitate</dt>
                            <dd className="whitespace-pre-line">{person.availability ?? 'Disponibilitate necompletată'}</dd>
                          </div>
                        </dl>
                      ))}
                    </div>
                  )}
                </div>

                {/* Statusul și butonul: jos pe telefon, coloana din dreapta pe ecran lat */}
                <div className="flex flex-col gap-3 border-t border-ink-100 pt-4 md:w-52 md:shrink-0 md:items-end md:border-t-0 md:border-l md:pt-0 md:pl-6">
                  <StatusBadge status={visit.backOfficeStatus} className="self-start md:self-end" />
                  {visit.backOfficeStartedAt && (
                    <p className="text-[13px] text-ink-500 md:text-right">
                      Început: {formatDateTime(visit.backOfficeStartedAt)}
                    </p>
                  )}
                  {visit.backOfficeFinishedAt && (
                    <p className="text-[13px] text-ink-500 md:text-right">
                      Finalizat: {formatDateTime(visit.backOfficeFinishedAt)}
                    </p>
                  )}
                  {!readOnly && action && (
                    <Button
                      variant={action.status === 'FINALIZAT' ? 'secondary' : 'primary'}
                      className="w-full md:mt-auto"
                      disabled={busy}
                      onClick={() => changeStatus(visit, action.status)}
                    >
                      {busy ? (
                        <>
                          <CircleNotch size={18} weight="bold" aria-hidden="true" className="animate-spin" />
                          Se salvează…
                        </>
                      ) : (
                        <>
                          <action.icon size={18} weight="bold" aria-hidden="true" />
                          {action.label}
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
