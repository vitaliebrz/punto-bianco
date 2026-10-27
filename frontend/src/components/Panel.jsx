import { cn } from '../cn'

// Un panou alb cu titlu (și iconiță) pentru o secțiune de pagină
export default function Panel({ icon: Icon, title, actions, className, children }) {
  return (
    <section className={cn('flex flex-col gap-4 rounded-2xl bg-white p-5 shadow-card ring-1 ring-ink-200/60', className)}>
      {title && (
        <div className="flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-2.5 text-base font-bold text-ink-800">
            {Icon && (
              <span className="flex size-8 items-center justify-center rounded-lg bg-mint-50 text-mint-700">
                <Icon size={18} weight="duotone" aria-hidden="true" />
              </span>
            )}
            {title}
          </h2>
          {actions}
        </div>
      )}
      {children}
    </section>
  )
}

// O pereche etichetă / valoare într-un panou
export function Detail({ label, children, className }) {
  return (
    <div className={cn('flex min-w-0 flex-col gap-1', className)}>
      <dt className="text-[13px] font-medium text-ink-500">{label}</dt>
      <dd className="text-[15px] break-words whitespace-pre-line text-ink-800">{children}</dd>
    </div>
  )
}
