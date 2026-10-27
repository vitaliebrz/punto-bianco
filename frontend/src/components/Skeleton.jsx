import { cn } from '../cn'

// O formă gri care pulsează lent, în locul conținutului care se încarcă
export default function Skeleton({ className }) {
  return <div aria-hidden="true" className={cn('animate-pulse rounded-lg bg-ink-200/70', className)} />
}

// Schelet pentru o listă de carduri / rânduri (paginile cu liste)
export function ListSkeleton({ rows = 4 }) {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="rounded-2xl bg-white p-5 shadow-card ring-1 ring-ink-200/60">
          <div className="flex items-center justify-between gap-4">
            <Skeleton className="h-5 w-48 max-w-[60%]" />
            <Skeleton className="h-6 w-24 rounded-full" />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">
            <Skeleton className="h-4" />
            <Skeleton className="h-4" />
            <Skeleton className="hidden h-4 md:block" />
            <Skeleton className="hidden h-4 md:block" />
          </div>
        </div>
      ))}
    </div>
  )
}
