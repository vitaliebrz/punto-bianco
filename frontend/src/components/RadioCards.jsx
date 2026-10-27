import { CheckCircle } from '@phosphor-icons/react/CheckCircle'
import { cn } from '../cn'
import { requiredMark } from '../formStyles'
import { FieldError } from './FormField'

// Alegere dintre câteva variante, afișate ca niște carduri. Tehnic sunt butoane radio (tastatura: săgeți).
// options = [{ value, label }]
export default function RadioCards({ name, label, value, options, onChange, error, required = false, className }) {
  const errorId = error ? `${name}-error` : undefined

  return (
    <fieldset className={cn('flex min-w-0 flex-col gap-2', className)} aria-describedby={errorId}>
      <legend className={cn('mb-2 text-sm font-medium text-ink-700', required && requiredMark)}>{label}</legend>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {options.map((option) => (
          <label key={option.value} className="relative min-w-0">
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              required={required}
              onChange={() => onChange(option.value)}
              className="peer sr-only"
            />
            <span
              className={cn(
                'flex h-full min-h-16 cursor-pointer items-center rounded-xl bg-white px-3.5 py-3 pr-9 text-sm font-medium text-ink-700',
                'ring-1 ring-ink-200 ring-inset transition-[box-shadow,background-color,color] duration-150 hover:ring-ink-300',
                'peer-checked:bg-mint-50 peer-checked:text-ink-900 peer-checked:ring-2 peer-checked:ring-mint-500',
                'peer-focus-visible:ring-2 peer-focus-visible:ring-mint-500 peer-focus-visible:ring-offset-2',
                error && 'ring-red-300',
              )}
            >
              {option.label}
            </span>
            {value === option.value && (
              <CheckCircle
                size={20}
                weight="fill"
                aria-hidden="true"
                className="pointer-events-none absolute top-2.5 right-2.5 text-mint-600"
              />
            )}
          </label>
        ))}
      </div>
      {error && <FieldError id={errorId}>{error}</FieldError>}
    </fieldset>
  )
}
