import { CalendarBlank } from '@phosphor-icons/react/CalendarBlank'
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

// Câmpurile de dată / oră: pe iPhone un câmp gol se afișează complet alb (fără text, fără iconiță),
// iar valoarea e centrată. Le dăm un text „Alege…” cât sunt goale, iconiță de calendar și text la stânga.
// Pe calculator, iconița mică a browserului e întinsă (invizibil) peste tot câmpul:
// un clic oriunde deschide calendarul.
const DATE_TYPES = {
  'datetime-local': 'Alege data și ora',
  date: 'Alege data',
}

const dateControlClasses = cn(
  'peer appearance-none pr-11 text-left',
  '[&::-webkit-date-and-time-value]:text-left [&::-webkit-date-and-time-value]:min-h-[1.5em]',
  '[&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0',
  '[&::-webkit-calendar-picker-indicator]:size-full [&::-webkit-calendar-picker-indicator]:cursor-pointer',
  '[&::-webkit-calendar-picker-indicator]:opacity-0',
)

// Un câmp de formular cu etichetă deasupra și mesaj de eroare sub el.
// as="textarea" | "select" | "input" (implicit); restul proprietăților ajung la câmp.
// required: asterisc după etichetă + aria-required (validarea o face serverul).
export default function FormField({ id, label, error, hint, required = false, as = 'input', className, children, ...props }) {
  const Control = as
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined
  const datePlaceholder = as === 'input' ? DATE_TYPES[props.type] : undefined
  const isEmptyDate = datePlaceholder && !props.value

  const control = (
    <Control
      id={id}
      aria-invalid={Boolean(error)}
      aria-required={required || undefined}
      aria-describedby={describedBy}
      className={cn(
        controlClasses,
        as === 'select' && 'appearance-none pr-10',
        as === 'textarea' && 'resize-y',
        datePlaceholder && dateControlClasses,
        // gol: ascundem masca browserului („zz.ll.aaaa, --:--”) și arătăm textul nostru; la focus revine masca
        isEmptyDate && 'text-transparent focus:text-ink-900',
      )}
      {...props}
    >
      {children}
    </Control>
  )

  let field = control
  if (as === 'select') {
    field = (
      <div className="relative">
        {control}
        <CaretDown
          size={16}
          weight="bold"
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 text-ink-500"
        />
      </div>
    )
  } else if (datePlaceholder) {
    field = (
      <div className="relative">
        {control}
        {isEmptyDate && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-base text-ink-500 peer-focus:hidden sm:text-[15px]"
          >
            {datePlaceholder}
          </span>
        )}
        <CalendarBlank
          size={20}
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 text-ink-500"
        />
      </div>
    )
  }

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <label htmlFor={id} className={cn('text-sm font-medium text-ink-700', required && requiredMark)}>
        {label}
      </label>
      {field}
      {hint && !error && (
        <span id={`${id}-hint`} className="text-[13px] text-ink-500">
          {hint}
        </span>
      )}
      {error && <FieldError id={`${id}-error`}>{error}</FieldError>}
    </div>
  )
}
