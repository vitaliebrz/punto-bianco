import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import prisma from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { loginSchema } from '../schemas/auth.js';

const router = Router();

const TOKEN_TTL = '8h';
const INVALID_CREDENTIALS = 'Email sau parolă greșite';

// Hash fals: când email-ul nu există comparăm totuși parola, ca timpul de răspuns
// să nu dezvăluie dacă un cont există sau nu.
const DUMMY_HASH = bcrypt.hashSync('parola-inexistenta', 10);

// Max 10 încercări eșuate / 15 minute / IP. Login-urile reușite nu se numără.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Prea multe încercări. Reîncearcă peste 15 minute.' },
});

router.post(
  '/login',
  loginLimiter,
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

export default router;
