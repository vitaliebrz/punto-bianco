import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma.js';

// Roluri care pot doar citi date (fără creare / modificare / ștergere)
export const READ_ONLY_ROLES = ['CONTABIL', 'CONTROL_CALITATE'];

// Verifică token-ul JWT din header-ul "Authorization: Bearer <token>"
// și încarcă utilizatorul din bază în req.user.
export async function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Autentificare necesară' });
  }

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
  } catch {
    return res.status(401).json({ error: 'Sesiune invalidă sau expirată' });
  }

  const userId = Number(payload.sub);
  if (!Number.isInteger(userId)) {
    return res.status(401).json({ error: 'Sesiune invalidă sau expirată' });
  }

  // Citim userul din bază la fiecare cerere: un cont dezactivat sau un rol schimbat
  // au efect imediat, fără să așteptăm expirarea token-ului.
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, fullName: true, role: true, active: true },
  });

  if (!user || !user.active) {
    return res.status(401).json({ error: 'Sesiune invalidă sau expirată' });
  }

  req.user = user;
  next();
}

// Permite accesul doar rolurilor date. ADMIN are acces peste tot.
export function requireRole(...roles) {
  return (req, res, next) => {
    if (req.user.role === 'ADMIN' || roles.includes(req.user.role)) {
      return next();
    }
    res.status(403).json({ error: 'Nu ai acces la această acțiune' });
  };
}

// Contabil și Control calitate: doar cereri de citire (GET / HEAD / OPTIONS).
export function readOnlyGuard(req, res, next) {
  const isRead = ['GET', 'HEAD', 'OPTIONS'].includes(req.method);
  if (!isRead && READ_ONLY_ROLES.includes(req.user.role)) {
    return res.status(403).json({ error: 'Rolul tău are acces doar la citire' });
  }
  next();
}
