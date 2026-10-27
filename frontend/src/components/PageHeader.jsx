import { Eye } from '@phosphor-icons/react/Eye'
import { cn } from '../cn'

// Antetul unei pagini: titlu, (opțional) o descriere, mențiunea „Doar vizualizare” și butoanele din dreapta.
export default function PageHeader({ title, description, readOnly = false, actions, className }) {
  return (
    <header className={cn('flex flex-wrap items-end justify-between gap-4', className)}>
      <div className="flex min-w-0 flex-col gap-1.5">
        <h1 className="text-2xl font-extrabold tracking-tight text-ink-800 sm:text-3xl">{title}</h1>
        {description && <p className="text-[15px] text-ink-500">{description}</p>}
        {readOnly && (
          <p className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-500">
            <Eye size={16} aria-hidden="true" />
            Doar vizualizare.
          </p>
        )}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  )
}
