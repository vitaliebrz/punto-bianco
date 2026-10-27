// O valoare cu iconiță într-un card (ex. sosirea, plecarea, coordonatorul).
// Folosită într-un <dl>: eticheta (`label`) e citită de cititoarele de ecran, iconița ține locul ei vizual.
export default function Meta({ icon: Icon, label, children }) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <Icon size={18} aria-hidden="true" className="shrink-0 text-ink-400" />
      <dt className="sr-only">{label}</dt>
      <dd className="min-w-0 text-[15px] text-ink-800">{children}</dd>
    </div>
  )
}
