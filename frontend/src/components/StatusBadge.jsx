import { ACCOMMODATION_STATUS_LABELS, BACK_OFFICE_STATUS_LABELS } from '../labels'

const LABELS = { ...BACK_OFFICE_STATUS_LABELS, ...ACCOMMODATION_STATUS_LABELS }

// Insignă colorată pentru statusuri: gri = de făcut, galben = în lucru, verde = gata
const TONE = {
  NEPRELUAT: 'todo',
  NEPRELUCRAT: 'todo',
  INCEPUT: 'progress',
  FINALIZAT: 'done',
  REZERVAT: 'done',
}

export default function StatusBadge({ status }) {
  return <span className={`badge badge-${TONE[status] ?? 'todo'}`}>{LABELS[status] ?? status}</span>
}
