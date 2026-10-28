import { CaretLeft } from '@phosphor-icons/react/CaretLeft'
import { CaretRight } from '@phosphor-icons/react/CaretRight'
import Button from './Button'

// „‹ Înapoi   Pagina 2 din 5   Înainte ›”. Pe prima pagină „Înapoi” e blocat, pe ultima „Înainte”.
export default function Pagination({ page, totalPages, onChange }) {
  return (
    <nav aria-label="Paginare" className="flex items-center justify-between gap-3">
      <Button variant="secondary" icon={CaretLeft} disabled={page <= 1} onClick={() => onChange(page - 1)}>
        Înapoi
      </Button>
      <p className="text-sm text-ink-600" aria-live="polite">
        Pagina <span className="font-medium text-ink-900">{page}</span> din{' '}
        <span className="font-medium text-ink-900">{totalPages}</span>
      </p>
      <Button variant="secondary" disabled={page >= totalPages} onClick={() => onChange(page + 1)}>
        Înainte
        <CaretRight size={18} weight="bold" aria-hidden="true" />
      </Button>
    </nav>
  )
}
