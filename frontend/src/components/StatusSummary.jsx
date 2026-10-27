import { cn } from '../cn'

// Rezumatul unei liste pe statusuri, ex. „3 Nepreluat · 1 Început · 6 Finalizat” (doar informativ)
// items = [{ label, count, tone: 'todo' | 'progress' | 'done' }]
const TONES = {
  todo: 'bg-ink-100 text-ink-700',
  progress: 'bg-amber-50 text-amber-800',
  done: 'bg-mint-100 text-mint-800',
}

export default function StatusSummary({ items, className }) {
  return (
    <ul aria-label="Rezumat" className={cn('flex flex-wrap gap-2', className)}>
      {items.map((item) => (
        <li
          key={item.label}
          className={cn('inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[13px] font-medium', TONES[item.tone])}
        >
          <span className="font-extrabold tabular-nums">{item.count}</span>
          {item.label}
        </li>
      ))}
    </ul>
  )
}
