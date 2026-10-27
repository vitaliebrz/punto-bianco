import { cn } from '../cn'

// O secțiune numerotată a unui formular lung: număr, iconiță, titlu, (opțional) o explicație
export default function FormSection({ number, icon: Icon, title, description, className, children }) {
  return (
    <fieldset className={cn('min-w-0 rounded-2xl bg-white p-5 shadow-card ring-1 ring-ink-200/60 sm:p-6', className)}>
      <legend className="sr-only">{title}</legend>
      <div className="mb-5 flex items-start gap-3.5" aria-hidden="true">
        <span className="relative flex size-11 shrink-0 items-center justify-center rounded-xl bg-mint-50 text-mint-700">
          {Icon && <Icon size={22} weight="duotone" />}
          <span className="absolute -top-1.5 -right-1.5 flex size-5 items-center justify-center rounded-full bg-ink-700 text-[11px] font-bold text-white ring-2 ring-white">
            {number}
          </span>
        </span>
        <div className="min-w-0 pt-0.5">
          <p className="text-[17px] font-bold text-ink-900">{title}</p>
          {description && <p className="text-sm text-ink-500">{description}</p>}
        </div>
      </div>
      <div className="flex flex-col gap-5">{children}</div>
    </fieldset>
  )
}

// Zonă care apare când e bifat un comutator (ex. datele însoțitorului)
export function Reveal({ children }) {
  return (
    <div className="flex animate-pop-in flex-col gap-5 rounded-xl bg-ink-50 p-4 ring-1 ring-ink-100 sm:p-5">
      {children}
    </div>
  )
}
