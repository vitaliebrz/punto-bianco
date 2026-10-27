import { cn } from '../cn'
import { FieldError } from './FormField'

// Butoane segmentate: o alegere din câteva variante. Tehnic sunt butoane radio (tastatura: săgeți).
// options = [{ value, label }]
export default function SegmentedControl({ name, label, value, options, onChange, error, className }) {
  const errorId = error ? `${name}-error` : undefined

  return (
    <fieldset className={cn('flex min-w-0 flex-col gap-2', className)} aria-describedby={errorId}>
      <legend className="mb-2 text-sm font-medium text-ink-700">{label}</legend>
      <div
        className={cn(
          'grid w-full auto-cols-fr grid-flow-col gap-1 rounded-xl bg-ink-100 p-1 sm:w-auto sm:self-start',
          error && 'ring-1 ring-red-400',
        )}
      >
        {options.map((option) => (
          <label key={option.value} className="relative min-w-0">
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
              className="peer sr-only"
            />
            <span
              className={cn(
                'flex h-10 cursor-pointer items-center justify-center rounded-lg px-4 text-center text-sm font-medium text-ink-600',
                'transition-[background-color,color,box-shadow] duration-150 hover:text-ink-900',
                'peer-checked:bg-white peer-checked:text-ink-900 peer-checked:shadow-sm',
                'peer-focus-visible:ring-2 peer-focus-visible:ring-mint-500',
              )}
            >
              {option.label}
            </span>
          </label>
        ))}
      </div>
      {error && <FieldError id={errorId}>{error}</FieldError>}
    </fieldset>
  )
}
