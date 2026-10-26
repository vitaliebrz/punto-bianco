import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { parseId } from '../lib/params.js';

const router = Router();

// Câte notificări recente se trimit la clopoțel
const LATEST_LIMIT = 20;

// Fiecare utilizator vede și modifică DOAR notificările lui (userId = req.user.id).

// Ultimele notificări + numărul celor necitite
router.get('/', async (req, res) => {
  const where = { userId: req.user.id };
  const [items, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: LATEST_LIMIT,
      select: { id: true, type: true, message: true, visitId: true, readAt: true, createdAt: true },
    }),
    prisma.notification.count({ where: { ...where, readAt: null } }),
  ]);
  res.json({ unreadCount, items });
});

// Marchează o notificare ca citită
router.patch('/:id/read', async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: 'Id invalid' });

  const notification = await prisma.notification.findFirst({
    where: { id, userId: req.user.id },
    select: { id: true, readAt: true },
  });
  // Notificarea altui utilizator arată la fel ca una inexistentă
  if (!notification) return res.status(404).json({ error: 'Notificarea nu există' });

  if (!notification.readAt) {
    await prisma.notification.update({ where: { id }, data: { readAt: new Date() } });
  }
  res.status(204).end();
});

// Marchează toate notificările utilizatorului ca citite
router.post('/read-all', async (req, res) => {
  const result = await prisma.notification.updateMany({
    where: { userId: req.user.id, readAt: null },
    data: { readAt: new Date() },
  });
  res.json({ updated: result.count });
});

export default router;
