import { ArrowClockwise } from '@phosphor-icons/react/ArrowClockwise'
import { WarningCircle } from '@phosphor-icons/react/WarningCircle'
import Button from './Button'
import { ListSkeleton } from './Skeleton'

// Panou de eroare cu „Reîncearcă”
export function ErrorState({ message, onRetry }) {
  return (
    <div className="flex flex-col items-start gap-4 rounded-2xl bg-white p-5 shadow-card ring-1 ring-red-100 sm:flex-row sm:items-center">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600">
        <WarningCircle size={22} weight="bold" aria-hidden="true" />
      </span>
      <p role="alert" className="flex-1 text-[15px] text-ink-800">
        {message}
      </p>
      {onRetry && (
        <Button variant="secondary" size="sm" icon={ArrowClockwise} onClick={onRetry}>
          Reîncearcă
        </Button>
      )}
    </div>
  )
}

// Stările comune ale unei pagini care încarcă date: schelet cât se încarcă, panou de eroare cu „Reîncearcă”.
// Returnează null când datele sunt gata, iar pagina își afișează conținutul.
// `skeleton`: forma afișată la încărcare (implicit, o listă de carduri).
export default function PageState({ loading, error, onRetry, skeleton = <ListSkeleton /> }) {
  if (loading) {
    return (
      <div role="status">
        <span className="sr-only">Se încarcă…</span>
        {skeleton}
      </div>
    )
  }
  if (error) {
    return <ErrorState message={error} onRetry={onRetry} />
  }
  return null
}
