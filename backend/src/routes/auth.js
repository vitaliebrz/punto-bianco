import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import prisma from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { loginSchema } from '../schemas/auth.js';

const TOKEN_TTL = '8h';
const INVALID_CREDENTIALS = 'Email sau parolă greșite';

// Hash fals: când email-ul nu există comparăm totuși parola, ca timpul de răspuns
// să nu dezvăluie dacă un cont există sau nu.
const DUMMY_HASH = bcrypt.hashSync('parola-inexistenta', 10);

const LIMIT_WINDOW_MS = 15 * 60 * 1000;
const LIMIT_MESSAGE = { error: 'Prea multe încercări. Reîncearcă peste 15 minute.' };

// Email-ul din cerere, normalizat (cererea nu e încă validată în acest punct)
const emailOf = (req) =>
  typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase().slice(0, 254) : '';

// Router nou la fiecare apel: fiecare aplicație (inclusiv în teste) are propriul
// contor pentru limita de încercări.
export function createAuthRouter() {
  const router = Router();

  // Două limite pentru încercările EȘUATE (login-urile reușite nu se numără):
  // - pe cont (email + IP): 10 / 15 minute. Cine ghicește parola unui cont e blocat pe acel cont,
  //   fără să-i blocheze pe colegii care intră de la același IP (toată clinica are același IP).
  // - pe IP: 100 / 15 minute, limita generală împotriva încercărilor pe multe conturi.
  // O singură limită de 10 pe IP bloca login-ul când 50 de colegi intrau în aceeași secundă
  // (găsit cu testul de încărcare: login-urile reușite sunt scăzute abia după ce se termină).
  const common = {
    windowMs: LIMIT_WINDOW_MS,
    skipSuccessfulRequests: true,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: LIMIT_MESSAGE,
  };
  const accountLimiter = rateLimit({
    ...common,
    limit: 10,
    keyGenerator: (req) => `${ipKeyGenerator(req.ip)}|${emailOf(req)}`,
  });
  const ipLimiter = rateLimit({ ...common, limit: 100 });

  router.post(
    '/login',
    ipLimiter,
    accountLimiter,
    validate(loginSchema, { message: 'Date de autentificare invalide' }),
    async (req, res) => {
      const { email, password } = req.body;

      const user = await prisma.user.findUnique({ where: { email } });
      const passwordOk = await bcrypt.compare(password, user ? user.passwordHash : DUMMY_HASH);

      if (!user || !user.active || !passwordOk) {
        return res.status(401).json({ error: INVALID_CREDENTIALS });
      }

      // Rolul vine din baza de date, niciodată din ce trimite clientul.
      const token = jwt.sign({ role: user.role }, process.env.JWT_SECRET, {
        subject: String(user.id),
        expiresIn: TOKEN_TTL,
        algorithm: 'HS256',
      });

      res.json({
        token,
        user: { id: user.id, email: user.email, fullName: user.fullName, role: user.role },
      });
    },
  );

  // Utilizatorul conectat (folosit de frontend la încărcarea paginii)
  router.get('/me', requireAuth, (req, res) => {
    const { id, email, fullName, role } = req.user;
    res.json({ user: { id, email, fullName, role } });
  });

  return router;
}
