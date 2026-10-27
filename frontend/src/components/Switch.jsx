import { cn } from '../cn'

// Comutator pornit/oprit. Tehnic e un checkbox (role="switch"), deci merge cu tastatura și cititoarele de ecran.
// Tot rândul (textul + comutatorul) e o singură etichetă: pe telefon se poate atinge oriunde pe rând,
// iar ținta are cel puțin 48 px înălțime.
export default function Switch({ id, label, description, checked, onChange, className }) {
  const descriptionId = description ? `${id}-description` : undefined

  return (
    <div className={cn('flex flex-col', className)}>
      <label
        htmlFor={id}
        className="relative -mx-2 flex min-h-12 cursor-pointer touch-manipulation items-center justify-between gap-4 rounded-xl px-2 select-none"
      >
        <span className="min-w-0 text-[15px] font-medium text-ink-800">{label}</span>

        <input
          id={id}
          type="checkbox"
          role="switch"
          checked={checked}
          onChange={onChange}
          aria-describedby={descriptionId}
          className="peer sr-only"
        />
        <span
          aria-hidden="true"
          className={cn(
            'relative h-7 w-12 shrink-0 rounded-full bg-ink-200 transition-colors duration-200',
            'peer-checked:bg-mint-500 peer-hover:bg-ink-300 peer-checked:peer-hover:bg-mint-600',
            'peer-focus-visible:ring-2 peer-focus-visible:ring-mint-500 peer-focus-visible:ring-offset-2',
            // butonul alb al comutatorului
            'after:absolute after:top-1 after:left-1 after:size-5 after:rounded-full after:bg-white after:shadow-sm',
            'after:transition-transform after:duration-200 peer-checked:after:translate-x-5',
          )}
        />
      </label>
      {description && (
        <p id={descriptionId} className="-mt-1 text-[13px] text-ink-500">
          {description}
        </p>
      )}
    </div>
  )
}
