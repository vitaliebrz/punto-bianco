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

const EMAIL_TAKEN = {
  error: 'Date invalide',
  details: [{ field: 'email', message: 'Există deja un cont cu acest email' }],
};

// Cont nou, cu parola inițială aleasă de Admin (salvată doar ca hash bcrypt)
router.post('/', requireRole(), validate(createUserSchema), async (req, res) => {
  const { fullName, email, role, password } = req.body;

  // Întâi emailul: bcrypt e intenționat lent, nu-l rulăm pentru un cont care oricum nu se creează
  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (existing) return res.status(409).json(EMAIL_TAKEN);

  const passwordHash = await bcrypt.hash(password, 10);
  try {
    const user = await prisma.user.create({
      data: { fullName, email, role, passwordHash },
      select: USER_FIELDS,
    });
    res.status(201).json(user);
  } catch (err) {
    // Două cereri simultane cu același email trec amândouă de verificarea de mai sus;
    // emailul e unic în bază, deci a doua e oprită aici
    if (isPrismaError(err, 'P2002')) return res.status(409).json(EMAIL_TAKEN);
    throw err;
  }
});

// Aruncată în tranzacție când schimbarea ar lăsa aplicația fără niciun Admin activ (anulează schimbarea)
class LastAdminError extends Error {}

// Dezactivare / reactivare. Un cont dezactivat pierde accesul imediat (requireAuth citește
// utilizatorul din bază la fiecare cerere); vizitele lui rămân neschimbate.
router.patch('/:id/active', requireRole(), validate(userActiveSchema), async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: 'Id invalid' });

  const { active } = req.body;
  if (id === req.user.id && !active) {
    return res.status(400).json({ error: 'Nu îți poți dezactiva propriul cont' });
  }

  try {
    // Trebuie să rămână cel puțin un Admin activ, care să poată reactiva conturile.
    // Serializable: doi Admini care se dezactivează unul pe altul în același timp ar vedea fiecare
    // „încă un Admin activ” și ar reuși amândoi; așa, baza oprește una dintre tranzacții (P2034).
    const user = await prisma.$transaction(
      async (tx) => {
        const updated = await tx.user.update({ where: { id }, data: { active }, select: USER_FIELDS });
        if (!active && updated.role === 'ADMIN') {
          const activeAdmins = await tx.user.count({ where: { role: 'ADMIN', active: true } });
          if (activeAdmins === 0) throw new LastAdminError();
        }
        return updated;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
    res.json(user);
  } catch (err) {
    if (err instanceof LastAdminError) {
      return res.status(400).json({ error: 'Trebuie să rămână cel puțin un Admin activ' });
    }
    if (isPrismaError(err, 'P2025')) return res.status(404).json({ error: 'Utilizatorul nu există' });
    if (isPrismaError(err, 'P2034')) {
      return res.status(409).json({ error: 'Conturile au fost schimbate în același timp. Reîncarcă lista.' });
    }
    throw err;
  }
});

export default router;
