import { cn } from '../cn'

// Listă goală: iconiță + titlu + (opțional) o explicație și o acțiune
export default function EmptyState({ icon: Icon, title, description, action, className }) {
  return (
    <div
      className={cn(
        'flex flex-col items-center gap-3 rounded-2xl border border-dashed border-ink-300 bg-white/60 px-6 py-12 text-center',
        className,
      )}
    >
      {Icon && (
        <span className="flex size-12 items-center justify-center rounded-full bg-mint-50 text-mint-700">
          <Icon size={24} weight="duotone" aria-hidden="true" />
        </span>
      )}
      <p className="text-base font-bold text-ink-800">{title}</p>
      {description && <p className="max-w-sm text-sm text-ink-500">{description}</p>}
      {action}
    </div>
  )
}
