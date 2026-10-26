// Calendarul șoferului nu are tabel propriu: evenimentele se construiesc din vizite.
// SOSIRE -> un eveniment la arrivalAt, PLECARE -> la departureAt, DUS_INTORS -> ambele.
const KINDS_BY_DIRECTION = {
  SOSIRE: ['SOSIRE'],
  PLECARE: ['PLECARE'],
  DUS_INTORS: ['SOSIRE', 'PLECARE'],
};

// visits: vizite cu transfer și patients
// from, to: intervalul afișat în calendar (from inclus, to exclus)
export function toTransferEvents(visits, from, to) {
  const events = [];

  for (const visit of visits) {
    if (!visit.transfer) continue;

    // pacientul principal primul, apoi însoțitorul
    const names = [...visit.patients]
      .sort((a, b) => Number(a.isCompanion) - Number(b.isCompanion))
      .map((person) => `${person.firstName} ${person.lastName}`);

    for (const kind of KINDS_BY_DIRECTION[visit.transfer.direction]) {
      const at = kind === 'SOSIRE' ? visit.arrivalAt : visit.departureAt;
      if (at < from || at >= to) continue;

      events.push({
        id: `${visit.id}-${kind}`,
        visitId: visit.id,
        kind,
        at,
        names,
        isFree: visit.transfer.isFree,
      });
    }
  }

  return events.sort((a, b) => a.at - b.at);
}
