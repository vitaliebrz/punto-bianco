import { CheckCircle } from '@phosphor-icons/react/CheckCircle'
import { CircleDashed } from '@phosphor-icons/react/CircleDashed'
import { HourglassMedium } from '@phosphor-icons/react/HourglassMedium'
import { cn } from '../cn'
import { ACCOMMODATION_STATUS_LABELS, BACK_OFFICE_STATUS_LABELS } from '../labels'

const LABELS = { ...BACK_OFFICE_STATUS_LABELS, ...ACCOMMODATION_STATUS_LABELS }

// gri = de făcut, galben = în lucru, mentă = gata (culoarea + iconița, nu doar culoarea)
const TONES = {
  todo: { icon: CircleDashed, className: 'bg-ink-100 text-ink-700 ring-ink-200' },
  progress: { icon: HourglassMedium, className: 'bg-amber-50 text-amber-800 ring-amber-200' },
  done: { icon: CheckCircle, className: 'bg-mint-100 text-mint-800 ring-mint-200' },
}

const TONE_BY_STATUS = {
  NEPRELUAT: 'todo',
  NEPRELUCRAT: 'todo',
  INCEPUT: 'progress',
  FINALIZAT: 'done',
  REZERVAT: 'done',
}

export default function StatusBadge({ status, className }) {
  const toneName = TONE_BY_STATUS[status] ?? 'todo'
  const { icon: Icon, className: toneClass } = TONES[toneName]

  return (
    <span
      data-status={status}
      data-tone={toneName}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[13px] leading-none font-medium whitespace-nowrap ring-1 ring-inset',
        toneClass,
        className,
      )}
    >
      <Icon size={14} weight="bold" aria-hidden="true" />
      {LABELS[status] ?? status}
    </span>
  )
}
