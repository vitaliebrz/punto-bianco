import { CaretDown } from '@phosphor-icons/react/CaretDown'
import { WarningCircle } from '@phosphor-icons/react/WarningCircle'
import { cn } from '../cn'
import { controlClasses, requiredMark } from '../formStyles'

// Mesajul de eroare sub un câmp (iconița nu face parte din textul citit de cititoarele de ecran)
export function FieldError({ id, children }) {
  return (
    <span id={id} className="flex items-start gap-1.5 text-[13px] font-medium text-red-700">
      <WarningCircle size={16} weight="bold" aria-hidden="true" className="mt-px shrink-0" />
      {children}
    </span>
  )
}

// Un câmp de formular cu etichetă deasupra și mesaj de eroare sub el.
// as="textarea" | "select" | "input" (implicit); restul proprietăților ajung la câmp.
// required: asterisc după etichetă + aria-required (validarea o face serverul).
export default function FormField({ id, label, error, hint, required = false, as = 'input', className, children, ...props }) {
  const Control = as
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined

  const control = (
    <Control
      id={id}
      aria-invalid={Boolean(error)}
      aria-required={required || undefined}
      aria-describedby={describedBy}
      className={cn(controlClasses, as === 'select' && 'appearance-none pr-10', as === 'textarea' && 'resize-y')}
      {...props}
    >
      {children}
    </Control>
  )

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <label htmlFor={id} className={cn('text-sm font-medium text-ink-700', required && requiredMark)}>
        {label}
      </label>
      {as === 'select' ? (
        <div className="relative">
          {control}
          <CaretDown
            size={16}
            weight="bold"
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 text-ink-500"
          />
        </div>
      ) : (
        control
      )}
      {hint && !error && (
        <span id={`${id}-hint`} className="text-[13px] text-ink-500">
          {hint}
        </span>
      )}
      {error && <FieldError id={`${id}-error`}>{error}</FieldError>}
    </div>
  )
}
