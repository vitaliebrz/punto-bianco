import { cn } from './cn'

// Asteriscul roșu după eticheta unui câmp obligatoriu. E desenat din CSS (::after), deci nu schimbă
// textul etichetei; cititoarele de ecran află că e obligatoriu din aria-required pe câmp.
export const requiredMark = "after:ml-0.5 after:font-bold after:text-red-600 after:content-['*']"

// Aspectul comun al câmpurilor de formular (input, textarea, select)
export const controlClasses = cn(
  'block w-full min-h-11 rounded-xl border-0 bg-white px-3.5 py-2.5 text-[15px] text-ink-900',
  'ring-1 ring-ink-200 ring-inset placeholder:text-ink-400 transition-shadow',
  'hover:ring-ink-300 focus:outline-none focus:ring-2 focus:ring-mint-500',
  'aria-invalid:ring-red-400 aria-invalid:focus:ring-red-500',
)
