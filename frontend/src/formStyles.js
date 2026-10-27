import { cn } from './cn'

// Asteriscul roșu după eticheta unui câmp obligatoriu. E desenat din CSS (::after), deci nu schimbă
// textul etichetei; cititoarele de ecran află că e obligatoriu din aria-required pe câmp.
export const requiredMark = "after:ml-0.5 after:font-bold after:text-red-600 after:content-['*']"

// Aspectul comun al câmpurilor de formular (input, textarea, select).
// Pe telefon textul are 16 px: sub 16 px, Safari pe iPhone mărește singur pagina când apeși pe câmp
// și nu o mai micșorează. De la `sm` (tabletă, calculator) revenim la 15 px.
export const controlClasses = cn(
  'block w-full min-h-11 rounded-xl border-0 bg-white px-3.5 py-2.5 text-base text-ink-900 sm:text-[15px]',
  'ring-1 ring-ink-200 ring-inset placeholder:text-ink-500 transition-shadow',
  'hover:ring-ink-300 focus:outline-none focus:ring-2 focus:ring-mint-500',
  'aria-invalid:ring-red-400 aria-invalid:focus:ring-red-500',
)
