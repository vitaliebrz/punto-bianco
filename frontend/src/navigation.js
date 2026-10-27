import { READ_ONLY_ROLES } from './roles'

// Cine vede ce pagină (aceleași reguli le impune și backend-ul). ADMIN vede tot.
export const PAGE_ROLES = {
  visits: ['COORDONATOR', ...READ_ONLY_ROLES],
  newVisit: ['COORDONATOR'],
  visitDetails: ['COORDONATOR', 'BACK_OFFICE', 'MANAGER_CAZARI', ...READ_ONLY_ROLES],
  backOffice: ['BACK_OFFICE', ...READ_ONLY_ROLES],
  accommodations: ['MANAGER_CAZARI', ...READ_ONLY_ROLES],
  transfers: ['SOFER', ...READ_ONLY_ROLES],
  users: [], // doar Admin
}

// Meniul din antet, în ordinea afișării
export const MENU = [
  { path: '/vizite', label: 'Vizite', roles: PAGE_ROLES.visits },
  { path: '/vizite/noua', label: 'Vizită nouă', roles: PAGE_ROLES.newVisit },
  { path: '/back-office', label: 'Back office', roles: PAGE_ROLES.backOffice },
  { path: '/cazari', label: 'Cazări', roles: PAGE_ROLES.accommodations },
  { path: '/transferuri', label: 'Calendar transferuri', roles: PAGE_ROLES.transfers },
  { path: '/utilizatori', label: 'Utilizatori', roles: PAGE_ROLES.users },
]

// Rolurile care primesc notificări (Pasul 2 din cerință)
export const NOTIFIED_ROLES = ['BACK_OFFICE', 'MANAGER_CAZARI']

export const canAccess = (role, roles) => role === 'ADMIN' || roles.includes(role)

export const menuFor = (role) => MENU.filter((item) => canAccess(role, item.roles))
