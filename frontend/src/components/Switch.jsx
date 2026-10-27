import { cn } from '../cn'

// Comutator pornit/oprit. Tehnic e un checkbox (role="switch"), deci merge cu tastatura și cititoarele de ecran.
export default function Switch({ id, label, description, checked, onChange, className }) {
  const descriptionId = description ? `${id}-description` : undefined

  return (
    <div className={cn('flex items-center justify-between gap-4', className)}>
      <div className="min-w-0">
        <label htmlFor={id} className="cursor-pointer text-[15px] font-medium text-ink-800">
          {label}
        </label>
        {description && (
          <p id={descriptionId} className="text-[13px] text-ink-500">
            {description}
          </p>
        )}
      </div>

      <span className="relative inline-flex h-7 w-12 shrink-0">
        <input
          id={id}
          type="checkbox"
          role="switch"
          checked={checked}
          onChange={onChange}
          aria-describedby={descriptionId}
          className="peer absolute inset-0 z-10 m-0 cursor-pointer opacity-0"
        />
        <span
          aria-hidden="true"
          className={cn(
            'h-7 w-12 rounded-full bg-ink-200 transition-colors duration-200',
            'peer-checked:bg-mint-500 peer-hover:bg-ink-300 peer-checked:peer-hover:bg-mint-600',
            'peer-focus-visible:ring-2 peer-focus-visible:ring-mint-500 peer-focus-visible:ring-offset-2',
          )}
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute top-1 left-1 size-5 rounded-full bg-white shadow-sm transition-transform duration-200 peer-checked:translate-x-5"
        />
      </span>
    </div>
  )
}
