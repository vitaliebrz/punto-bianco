import { Eye } from '@phosphor-icons/react/Eye'
import { EyeSlash } from '@phosphor-icons/react/EyeSlash'

// Butonul cu ochi din dreapta unui câmp de parolă: arată / ascunde parola.
// controls = id-ul câmpului; shown = parola e vizibilă acum.
// Eticheta spune ce face un clic („Arată” / „Ascunde”); fără aria-pressed, care împreună cu
// eticheta schimbătoare s-ar citi contradictoriu („Ascunde parola, apăsat”).
export default function PasswordToggle({ controls, shown, onToggle }) {
  return (
    <button
      type="button"
      aria-label={shown ? 'Ascunde parola' : 'Arată parola'}
      aria-controls={controls}
      onClick={onToggle}
      className="flex size-10 items-center justify-center rounded-lg text-ink-500 transition-colors hover:bg-ink-100 hover:text-ink-800 focus-visible:ring-2 focus-visible:ring-mint-500 focus-visible:outline-none"
    >
      {shown ? <EyeSlash size={20} aria-hidden="true" /> : <Eye size={20} aria-hidden="true" />}
    </button>
  )
}
