import { Link } from 'react-router-dom'
import { cn } from '../cn'

const VARIANTS = {
  // menta brandului cu text gri foarte închis (contrast ~9:1; textul alb pe mentă ar fi ilizibil)
  primary: 'bg-mint-300 text-ink-900 shadow-sm shadow-mint-700/10 hover:bg-mint-400',
  secondary: 'bg-white text-ink-700 ring-1 ring-inset ring-ink-200 hover:bg-ink-50 hover:ring-ink-300',
  ghost: 'text-ink-600 hover:bg-ink-100 hover:text-ink-900',
}

const SIZES = {
  md: 'h-11 px-5 text-[15px]',
  sm: 'h-9 px-3.5 text-sm',
  icon: 'size-11',
}

// Butonul aplicației. Cu `to` devine link (react-router); `icon` = o iconiță Phosphor.
export default function Button({
  variant = 'primary',
  size = 'md',
  icon: Icon,
  to,
  className,
  children,
  type = 'button',
  ...props
}) {
  const classes = cn(
    'inline-flex shrink-0 items-center justify-center gap-2 rounded-xl font-medium whitespace-nowrap select-none',
    'transition-[background-color,box-shadow,color,transform] duration-150 active:scale-[0.98]',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mint-500 focus-visible:ring-offset-2',
    'disabled:pointer-events-none disabled:opacity-55',
    VARIANTS[variant],
    SIZES[size],
    className,
  )
  const content = (
    <>
      {Icon && <Icon size={size === 'sm' ? 16 : 18} weight="bold" aria-hidden="true" />}
      {children}
    </>
  )

  if (to) {
    return (
      <Link to={to} className={classes} {...props}>
        {content}
      </Link>
    )
  }
  return (
    <button type={type} className={classes} {...props}>
      {content}
    </button>
  )
}
