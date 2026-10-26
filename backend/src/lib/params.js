// Id-ul din URL (ex. /api/visits/12) -> număr întreg pozitiv sau null dacă e invalid.
export function parseId(value) {
  if (!/^\d{1,9}$/.test(value)) return null;
  const id = Number(value);
  return id > 0 ? id : null;
}
