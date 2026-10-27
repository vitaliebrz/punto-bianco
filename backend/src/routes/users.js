import { Router } from 'express';
import bcrypt from 'bcrypt';
import { Prisma } from '@prisma/client';
import prisma from '../lib/prisma.js';
import { parseId } from '../lib/params.js';
import { requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { createUserSchema, userActiveSchema } from '../schemas/user.js';

const router = Router();

// Ce se trimite despre un utilizator în lista Admin-ului (niciodată passwordHash)
const USER_FIELDS = { id: true, email: true, fullName: true, role: true, active: true, createdAt: true };

// Eroarea Prisma pentru o valoare unică deja folosită (email) / un rând inexistent
const isPrismaError = (err, code) => err instanceof Prisma.PrismaClientKnownRequestError && err.code === code;

// Coordonatorii activi, pentru lista „coordonator responsabil” din formularul de pacient
router.get('/coordinators', async (req, res) => {
  const coordinators = await prisma.user.findMany({
    where: { role: 'COORDONATOR', active: true },
    select: { id: true, fullName: true },
    orderBy: { fullName: 'asc' },
  });
  res.json(coordinators);
});

// ---------- Gestionarea utilizatorilor: doar Admin (requireRole() fără roluri) ----------

// Toți utilizatorii: întâi cei activi, apoi după nume
router.get('/', requireRole(), async (req, res) => {
  const users = await prisma.user.findMany({
    select: USER_FIELDS,
    orderBy: [{ active: 'desc' }, { fullName: 'asc' }],
  });
  res.json(users);
});

// Cont nou, cu parola inițială aleasă de Admin (salvată doar ca hash bcrypt)
router.post('/', requireRole(), validate(createUserSchema), async (req, res) => {
  const { fullName, email, role, password } = req.body;
  const passwordHash = await bcrypt.hash(password, 10);

  try {
    const user = await prisma.user.create({
      data: { fullName, email, role, passwordHash },
      select: USER_FIELDS,
    });
    res.status(201).json(user);
  } catch (err) {
    // Emailul e unic în bază: așa e corect și când două cereri cu același email vin simultan
    if (isPrismaError(err, 'P2002')) {
      return res.status(409).json({
        error: 'Date invalide',
        details: [{ field: 'email', message: 'Există deja un cont cu acest email' }],
      });
    }
    throw err;
  }
});

// Dezactivare / reactivare. Un cont dezactivat pierde accesul imediat (requireAuth citește
// utilizatorul din bază la fiecare cerere); vizitele lui rămân neschimbate.
router.patch('/:id/active', requireRole(), validate(userActiveSchema), async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: 'Id invalid' });

  const { active } = req.body;
  // Altfel aplicația ar putea rămâne fără niciun Admin care să reactiveze conturile
  if (id === req.user.id && !active) {
    return res.status(400).json({ error: 'Nu îți poți dezactiva propriul cont' });
  }

  try {
    const user = await prisma.user.update({ where: { id }, data: { active }, select: USER_FIELDS });
    res.json(user);
  } catch (err) {
    if (isPrismaError(err, 'P2025')) return res.status(404).json({ error: 'Utilizatorul nu există' });
    throw err;
  }
});

export default router;
