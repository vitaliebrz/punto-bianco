import { cn } from '../cn'

// Logo-ul Punto Bianco, refăcut din fișierul original (brand/logo-punto-bianco.png):
// un cerc cu dintele în mijloc + textul „PUNTO BIANCO” cu majuscule, sub cerc.
// Originalul e alb (făcut pentru fundal închis). Aici dintele și textul sunt măști decupate din el,
// deci păstrează exact desenul și literele originale, dar pot fi colorate cu culorile brandului.

const mask = (url) => ({
  maskImage: `url(${url})`,
  WebkitMaskImage: `url(${url})`,
  maskSize: 'contain',
  WebkitMaskSize: 'contain',
  maskRepeat: 'no-repeat',
  WebkitMaskRepeat: 'no-repeat',
  maskPosition: 'center',
  WebkitMaskPosition: 'center',
})

const TOOTH_MASK = mask('/brand/tooth-mask.png') // 356x419
const WORDMARK_MASK = mask('/brand/wordmark-mask.png') // 1351x131

// Doar dintele; ia culoarea textului (`text-…`)
export function ToothMark({ className }) {
  return (
    <span
      aria-hidden="true"
      className={cn('inline-block aspect-356/419 shrink-0 bg-current', className)}
      style={TOOTH_MASK}
    />
  )
}

// Cercul cu dintele, ca în original: dintele ocupă 67% din cerc, puțin sub centru.
// `className` dă mărimea și culoarea cercului (bg-…), `toothClassName` culoarea dintelui (text-…).
export function LogoMark({ className = 'size-10 bg-mint-300', toothClassName = 'text-white' }) {
  return (
    <span
      aria-hidden="true"
      className={cn('inline-flex aspect-square shrink-0 items-center justify-center rounded-full', className)}
    >
      <ToothMark className={cn('h-[67%] translate-y-[2.4%]', toothClassName)} />
    </span>
  )
}

// Textul „PUNTO BIANCO” din logo (literele originale); ia culoarea textului (`text-…`)
export function Wordmark({ className }) {
  return (
    <span
      aria-hidden="true"
      className={cn('inline-block aspect-1351/131 shrink-0 bg-current', className)}
      style={WORDMARK_MASK}
    />
  )
}

// Logo complet.
// layout="row": cerc + text alături (bara laterală, bara de sus)
// layout="stack": cerc deasupra, text dedesubt, ca în original (pagina de login)
export default function Logo({
  layout = 'row',
  className,
  markClassName,
  toothClassName,
  wordmarkClassName,
}) {
  const stack = layout === 'stack'
  return (
    <span
      className={cn(
        'inline-flex items-center',
        // în original: cerc 588 px, spațiu 58 px, text 129 px înălțime (≈2,3× lățimea cercului)
        stack ? 'flex-col gap-3' : 'gap-3',
        className,
      )}
    >
      <span className="sr-only">Punto Bianco</span>
      <LogoMark
        className={markClassName ?? (stack ? 'size-28 bg-white' : 'size-10 bg-mint-300')}
        toothClassName={toothClassName ?? (stack ? 'text-ink-200' : 'text-white')}
      />
      <Wordmark className={wordmarkClassName ?? (stack ? 'h-6 text-white' : 'h-3.5 text-ink-700')} />
    </span>
  )
}
