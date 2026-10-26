import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { READ_ONLY_ROLES, requireRole } from '../middleware/auth.js';
import { transfersRangeSchema } from '../schemas/transfer.js';
import { toTransferEvents } from '../services/transferEvents.js';

const router = Router();

// Calendarul șoferului: evenimentele de transfer din intervalul afișat.
// GET /api/transfers?from=2026-11-02T00:00:00Z&to=2026-11-09T00:00:00Z
router.get('/', requireRole('SOFER', ...READ_ONLY_ROLES), async (req, res) => {
  const result = transfersRangeSchema.safeParse(req.query);
  if (!result.success) {
    return res.status(400).json({
      error: 'Date invalide',
      details: result.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      })),
    });
  }
  const { from, to } = result.data;

  // Vizitele cu transfer care au sosirea sau plecarea în interval
  const visits = await prisma.visit.findMany({
    where: {
      transfer: { isNot: null },
      OR: [
        { arrivalAt: { gte: from, lt: to } },
        { departureAt: { gte: from, lt: to } },
      ],
    },
    select: {
      id: true,
      arrivalAt: true,
      departureAt: true,
      transfer: { select: { direction: true, isFree: true } },
      patients: { select: { firstName: true, lastName: true, isCompanion: true } },
    },
  });

  res.json(toTransferEvents(visits, from, to));
});

export default router;
