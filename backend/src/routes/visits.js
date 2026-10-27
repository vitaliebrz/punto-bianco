import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { parseId } from '../lib/params.js';
import { READ_ONLY_ROLES, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { backOfficeStatusSchema, createVisitSchema } from '../schemas/visit.js';
import { buildVisitNotifications, NOTIFIED_ROLES } from '../services/notifications.js';
import { personCreateData, serializeVisit, visitInclude } from '../services/visits.js';

const router = Router();

// Cine vede lista vizitelor (ADMIN are acces peste tot, vezi requireRole)
const LIST_ROLES = ['COORDONATOR', 'BACK_OFFICE', ...READ_ONLY_ROLES];

// Back office: NEPRELUAT -> INCEPUT -> FINALIZAT, fără pași săriți sau înapoi
const BACK_OFFICE_TRANSITIONS = {
  INCEPUT: { from: 'NEPRELUAT', timestamp: 'backOfficeStartedAt' },
  FINALIZAT: { from: 'INCEPUT', timestamp: 'backOfficeFinishedAt' },
};

// Lista vizitelor, ordonată după data sosirii
router.get('/', requireRole(...LIST_ROLES), async (req, res) => {
  const visits = await prisma.visit.findMany({
    include: visitInclude,
    orderBy: [{ arrivalAt: 'asc' }, { id: 'asc' }],
  });
  res.json(visits.map(serializeVisit));
});

// Detaliile unei vizite (și Managerul de cazări, dar doar pentru vizitele cu cerere de cazare:
// detaliile conțin tratamentul pacienților, de care nu are nevoie pentru celelalte vizite).
router.get('/:id', requireRole(...LIST_ROLES, 'MANAGER_CAZARI'), async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: 'Id invalid' });

  const where = req.user.role === 'MANAGER_CAZARI' ? { id, accommodation: { isNot: null } } : { id };
  // Vizita fără cazare arată pentru Managerul de cazări ca una inexistentă (404), fără să dezvăluie că există
  const visit = await prisma.visit.findFirst({ where, include: visitInclude });
  if (!visit) return res.status(404).json({ error: 'Vizita nu există' });

  res.json(serializeVisit(visit));
});

// Pasul 1: coordonatorul înregistrează vizita.
// Pasul 2: în aceeași tranzacție se creează notificările pentru echipă.
router.post('/', requireRole('COORDONATOR'), validate(createVisitSchema), async (req, res) => {
  const data = req.body;

  const coordinator = await prisma.user.findFirst({
    where: { id: data.coordinatorId, role: 'COORDONATOR', active: true },
    select: { id: true },
  });
  if (!coordinator) {
    return res.status(400).json({
      error: 'Date invalide',
      details: [{ field: 'coordinatorId', message: 'Coordonator invalid' }],
    });
  }

  // Tranzacție: se salvează totul (vizita + notificările) sau nimic.
  const visit = await prisma.$transaction(async (tx) => {
    const created = await tx.visit.create({
      data: {
        arrivalAt: data.arrivalAt,
        departureAt: data.departureAt,
        hasCompanion: data.companion !== null,
        coordinatorId: coordinator.id,
        createdById: req.user.id,
        patients: {
          create: [
            personCreateData(data.patient, false),
            ...(data.companion ? [personCreateData(data.companion, true)] : []),
          ],
        },
        ...(data.accommodation && { accommodation: { create: data.accommodation } }),
        ...(data.transfer && { transfer: { create: data.transfer } }),
      },
      include: visitInclude,
    });

    const recipients = await tx.user.findMany({
      where: { role: { in: NOTIFIED_ROLES }, active: true },
      select: { id: true, role: true },
    });
    const notifications = buildVisitNotifications(created, recipients);
    if (notifications.length > 0) {
      await tx.notification.createMany({ data: notifications });
    }

    return created;
  });

  res.status(201).json(serializeVisit(visit));
});

// Back office: „Început” / „Finalizat”
router.patch(
  '/:id/back-office-status',
  requireRole('BACK_OFFICE'),
  validate(backOfficeStatusSchema),
  async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: 'Id invalid' });

    const { status } = req.body;
    const transition = BACK_OFFICE_TRANSITIONS[status];

    // Condiția pe statusul curent face schimbarea sigură când doi oameni apasă
    // în același timp: doar primul reușește, al doilea primește 409.
    const result = await prisma.visit.updateMany({
      where: { id, backOfficeStatus: transition.from },
      data: { backOfficeStatus: status, [transition.timestamp]: new Date() },
    });

    if (result.count === 0) {
      const exists = await prisma.visit.findUnique({ where: { id }, select: { id: true } });
      if (!exists) return res.status(404).json({ error: 'Vizita nu există' });
      return res.status(409).json({ error: 'Statusul a fost deja schimbat. Reîncarcă lista.' });
    }

    const visit = await prisma.visit.findUnique({ where: { id }, include: visitInclude });
    res.json(serializeVisit(visit));
  },
);

export default router;
