import { useState } from 'react'
import { AirplaneLanding } from '@phosphor-icons/react/AirplaneLanding'
import { AirplaneTakeoff } from '@phosphor-icons/react/AirplaneTakeoff'
import { Bed } from '@phosphor-icons/react/Bed'
import { Buildings } from '@phosphor-icons/react/Buildings'
import { CheckCircle } from '@phosphor-icons/react/CheckCircle'
import { CircleNotch } from '@phosphor-icons/react/CircleNotch'
import { IdentificationBadge } from '@phosphor-icons/react/IdentificationBadge'
import { Link } from 'react-router-dom'
import { apiFetch } from '../api'
import { useAuth } from '../auth/useAuth'
import { cn } from '../cn'
import Button from '../components/Button'
import EmptyState from '../components/EmptyState'
import Meta from '../components/Meta'
import PageHeader from '../components/PageHeader'
import PageState, { ErrorState } from '../components/PageState'
import StatusBadge from '../components/StatusBadge'
import StatusSummary from '../components/StatusSummary'
import { formatDateTime } from '../format'
import { accommodationCostLabel, APARTMENT_LABELS, countByStatus, peopleNames } from '../labels'
import { isReadOnly } from '../roles'
import { useApiData } from '../useApiData'

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

  const counts = countByStatus(requests ?? [], (request) => request.status)

  return (
    <section className="flex flex-col gap-6">
      <PageHeader title="Cazări" description="Cererile de cazare, în ordinea datei de sosire." readOnly={readOnly} />

      {requests && requests.length > 0 && (
        <StatusSummary
          items={[
            { label: 'Neprelucrat', count: counts.NEPRELUCRAT ?? 0, tone: 'todo' },
            { label: 'Rezervat', count: counts.REZERVAT ?? 0, tone: 'done' },
          ]}
        />
      )}

      {actionError && <ErrorState message={actionError} />}

      <PageState loading={loading} error={error} onRetry={reload} />

      {requests && requests.length === 0 && (
        <EmptyState
          icon={Buildings}
          title="Nu există cereri de cazare."
          description="Cererile apar aici automat când un coordonator înregistrează o vizită cu cazare."
        />
      )}

      {requests && requests.length > 0 && (
        <ul className="flex flex-col gap-3">
          {requests.map((request) => {
            const busy = busyId === request.id
            return (
              <li
                key={request.id}
                className="flex flex-col gap-4 rounded-2xl bg-white p-5 shadow-card ring-1 ring-ink-200/60 md:flex-row md:gap-6"
              >
                <div className="flex min-w-0 flex-1 flex-col gap-4">
                  <Link
                    to={`/vizite/${request.visit.id}`}
                    className="self-start rounded text-[17px] font-bold text-ink-900 hover:text-mint-700 focus-visible:ring-2 focus-visible:ring-mint-500 focus-visible:outline-none"
                  >
                    {peopleNames(request.visit.patients)}
                  </Link>

                  <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                    <span className="inline-flex items-center gap-2 rounded-xl bg-mint-50 px-3 py-2 text-[15px] font-bold text-ink-900 ring-1 ring-mint-100">
                      <Bed size={20} weight="duotone" aria-hidden="true" className="text-mint-700" />
                      <span className="sr-only">Apartament: </span>
                      {APARTMENT_LABELS[request.apartmentType]}
                    </span>
                    <span
                      className={cn(
                        'rounded-full px-3 py-1 text-[13px] font-medium',
                        request.isFree ? 'bg-mint-100 text-mint-800' : 'bg-ink-100 text-ink-700',
                      )}
                    >
                      {accommodationCostLabel(request)}
                    </span>
                  </div>

                  <dl className="flex flex-wrap gap-x-6 gap-y-2">
                    <Meta icon={AirplaneLanding} label="Sosire">
                      {formatDateTime(request.visit.arrivalAt)}
                    </Meta>
                    <Meta icon={AirplaneTakeoff} label="Plecare">
                      {formatDateTime(request.visit.departureAt)}
                    </Meta>
                    <Meta icon={IdentificationBadge} label="Coordonator">
                      {request.visit.coordinator.fullName}
                    </Meta>
                  </dl>
                </div>

                {/* Statusul și butonul: jos pe telefon, coloana din dreapta pe ecran lat */}
                <div className="flex flex-col gap-3 border-t border-ink-100 pt-4 md:w-52 md:shrink-0 md:items-end md:border-t-0 md:border-l md:pt-0 md:pl-6">
                  <StatusBadge status={request.status} className="self-start md:self-end" />
                  {request.reservedAt && (
                    <p className="text-[13px] text-ink-500 md:text-right">
                      Rezervat la <time dateTime={request.reservedAt}>{formatDateTime(request.reservedAt)}</time>
                    </p>
                  )}
                  {!readOnly && request.status === 'NEPRELUCRAT' && (
                    <Button className="w-full md:mt-auto" disabled={busy} onClick={() => markReserved(request)}>
                      {busy ? (
                        <>
                          <CircleNotch size={18} weight="bold" aria-hidden="true" className="animate-spin" />
                          Se salvează…
                        </>
                      ) : (
                        <>
                          <CheckCircle size={18} weight="bold" aria-hidden="true" />
                          Marchează rezervat
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
