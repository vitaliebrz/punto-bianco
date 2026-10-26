import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { parseId } from '../lib/params.js';
import { READ_ONLY_ROLES, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { accommodationStatusSchema } from '../schemas/visit.js';

const router = Router();

const accommodationInclude = {
  visit: {
    select: {
      id: true,
      arrivalAt: true,
      departureAt: true,
      coordinator: { select: { id: true, fullName: true } },
      patients: {
        orderBy: [{ isCompanion: 'asc' }, { id: 'asc' }],
        select: { firstName: true, lastName: true, isCompanion: true },
      },
    },
  },
};

function serializeAccommodation(accommodation) {
  return {
    id: accommodation.id,
    apartmentType: accommodation.apartmentType,
    isFree: accommodation.isFree,
    freeDays: accommodation.freeDays,
    status: accommodation.status,
    reservedAt: accommodation.reservedAt,
    visit: accommodation.visit,
  };
}

// Cererile de cazare, ordonate după data sosirii
router.get('/', requireRole('MANAGER_CAZARI', ...READ_ONLY_ROLES), async (req, res) => {
  const accommodations = await prisma.accommodation.findMany({
    include: accommodationInclude,
    orderBy: [{ visit: { arrivalAt: 'asc' } }, { id: 'asc' }],
  });
  res.json(accommodations.map(serializeAccommodation));
});

// Manager cazări: „Neprelucrat” -> „Rezervat”
router.patch(
  '/:id/status',
  requireRole('MANAGER_CAZARI'),
  validate(accommodationStatusSchema),
  async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: 'Id invalid' });

    // Ca la Back office: doar o cerere încă neprelucrată poate fi marcată rezervată.
    const result = await prisma.accommodation.updateMany({
      where: { id, status: 'NEPRELUCRAT' },
      data: { status: 'REZERVAT', reservedAt: new Date() },
    });

    if (result.count === 0) {
      const exists = await prisma.accommodation.findUnique({ where: { id }, select: { id: true } });
      if (!exists) return res.status(404).json({ error: 'Cererea de cazare nu există' });
      return res.status(409).json({ error: 'Cererea a fost deja marcată rezervată. Reîncarcă lista.' });
    }

    const accommodation = await prisma.accommodation.findUnique({
      where: { id },
      include: accommodationInclude,
    });
    res.json(serializeAccommodation(accommodation));
  },
);

export default router;
