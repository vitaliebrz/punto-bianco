import { Router } from 'express';
import prisma from '../lib/prisma.js';

const router = Router();

// Coordonatorii activi, pentru lista „coordonator responsabil” din formularul de pacient
router.get('/coordinators', async (req, res) => {
  const coordinators = await prisma.user.findMany({
    where: { role: 'COORDONATOR', active: true },
    select: { id: true, fullName: true },
    orderBy: { fullName: 'asc' },
  });
  res.json(coordinators);
});

export default router;
