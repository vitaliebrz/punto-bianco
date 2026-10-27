import { cn } from '../cn'

// Dintele din logo, folosit ca mască: ia culoarea textului (`text-…`), deci merge pe orice fundal.
// Fișierul (public/brand/tooth-mask.png) e decupat din logo-ul original; raport lățime/înălțime ≈ 0,85.
const MASK = {
  maskImage: 'url(/brand/tooth-mask.png)',
  WebkitMaskImage: 'url(/brand/tooth-mask.png)',
  maskSize: 'contain',
  WebkitMaskSize: 'contain',
  maskRepeat: 'no-repeat',
  WebkitMaskRepeat: 'no-repeat',
  maskPosition: 'center',
  WebkitMaskPosition: 'center',
}

export function ToothMark({ className }) {
  return (
    <span
      aria-hidden="true"
      className={cn('inline-block aspect-[356/419] shrink-0 bg-current', className)}
      style={MASK}
    />
  )
}

// Semnul + numele clinicii
export default function Logo({ className, markClassName = 'h-8', nameClassName = 'text-lg' }) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <ToothMark className={markClassName} />
      <span className={cn('font-extrabold tracking-tight', nameClassName)}>Punto Bianco</span>
    </span>
  )
}
