import { CircleNotch } from '@phosphor-icons/react/CircleNotch'
import { cn } from '../cn'

// „Se încarcă…” cu un cerc care se învârte (pornirea aplicației, descărcarea unei pagini)
export default function Loader({ fullScreen = false, className }) {
  return (
    <div
      role="status"
      className={cn(
        'flex flex-col items-center justify-center gap-3 px-4 py-16 text-ink-500',
        fullScreen && 'min-h-dvh',
        className,
      )}
    >
      <CircleNotch size={32} weight="bold" aria-hidden="true" className="animate-spin text-mint-500" />
      <p className="text-[15px]">Se încarcă…</p>
    </div>
  )
}
