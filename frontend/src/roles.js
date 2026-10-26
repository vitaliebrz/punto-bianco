// Denumirile rolurilor afișate în interfață
export const ROLE_LABELS = {
  ADMIN: 'Admin',
  COORDONATOR: 'Coordonator tratament',
  BACK_OFFICE: 'Back office',
  MANAGER_CAZARI: 'Manager cazări',
  SOFER: 'Șofer',
  CONTABIL: 'Contabil',
  CONTROL_CALITATE: 'Control calitate',
}

// Roluri care pot doar vizualiza (aceeași regulă e impusă și de backend)
export const READ_ONLY_ROLES = ['CONTABIL', 'CONTROL_CALITATE']

export const isReadOnly = (role) => READ_ONLY_ROLES.includes(role)
