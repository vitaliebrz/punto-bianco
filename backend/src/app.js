import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createAuthRouter } from './routes/auth.js';
import userRoutes from './routes/users.js';
import visitRoutes from './routes/visits.js';
import accommodationRoutes from './routes/accommodations.js';
import transferRoutes from './routes/transfers.js';
import notificationRoutes from './routes/notifications.js';
import { parseTrustProxy } from './config.js';
import { requireAuth, readOnlyGuard } from './middleware/auth.js';

// Construiește aplicația Express (fără s-o pornească).
// index.js o pornește pe un port; testele o folosesc direct.
export function createApp() {
  const app = express();

  // În spatele unui proxy (Render) IP-ul real vine în header-ul X-Forwarded-For.
  // Îl credem DOAR dacă TRUST_PROXY e setat (numărul de proxy-uri din fața aplicației);
  // altfel oricine ar putea trimite un IP fals și ar ocoli limita de încercări la login.
  // O valoare greșită oprește pornirea (vezi config.js).
  const trustProxy = parseTrustProxy(process.env.TRUST_PROXY);
  if (trustProxy !== undefined) {
    app.set('trust proxy', trustProxy);
  }

  // Header-e HTTP de securitate standard (ex. interzice încărcarea API-ului în iframe)
  app.use(helmet());

  // Doar frontend-ul nostru poate chema API-ul din browser.
  // Browserul trimite adresa fără "/" la final, deci o scoatem și din configurare.
  const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:5173').trim().replace(/\/+$/, '');
  app.use(cors({ origin: frontendUrl }));
  app.use(express.json({ limit: '10kb' }));

  // Verificare rapidă că serverul rulează (folosit și de Render pentru health check)
  app.get('/api/health', (req, res) => {
    res.json({ ok: true });
  });

  app.use('/api/auth', createAuthRouter());

  // Rutele de mai jos cer utilizator conectat; rolurile read-only pot doar citi.
  app.use('/api/users', requireAuth, readOnlyGuard, userRoutes);
  app.use('/api/visits', requireAuth, readOnlyGuard, visitRoutes);
  app.use('/api/accommodations', requireAuth, readOnlyGuard, accommodationRoutes);
  app.use('/api/transfers', requireAuth, readOnlyGuard, transferRoutes);
  app.use('/api/notifications', requireAuth, readOnlyGuard, notificationRoutes);

  // Rută inexistentă
  app.use('/api', (req, res) => {
    res.status(404).json({ error: 'Rută inexistentă' });
  });

  // Erori: JSON invalid / prea mare -> 400 / 413; orice altceva -> 500 fără detalii tehnice
  app.use((err, req, res, next) => {
    if (err.type === 'entity.parse.failed') {
      return res.status(400).json({ error: 'JSON invalid' });
    }
    if (err.type === 'entity.too.large') {
      return res.status(413).json({ error: 'Cerere prea mare' });
    }
    console.error(err);
    res.status(500).json({ error: 'Eroare internă' });
  });

  return app;
}
