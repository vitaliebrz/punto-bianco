import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import { requireAuth, readOnlyGuard } from './middleware/auth.js';

if (!process.env.JWT_SECRET) {
  console.error('Lipsește JWT_SECRET în .env');
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 3000;

// Pe Render aplicația stă în spatele unui proxy: așa vedem IP-ul real (pentru rate limit).
app.set('trust proxy', 1);

app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173' }));
app.use(express.json({ limit: '10kb' }));

// Verificare rapidă că serverul rulează (folosit și de Render pentru health check)
app.get('/api/health', (req, res) => {
  res.json({ ok: true });
});

app.use('/api/auth', authRoutes);

// Rutele de mai jos cer utilizator conectat; rolurile read-only pot doar citi.
app.use('/api/users', requireAuth, readOnlyGuard, userRoutes);

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

app.listen(PORT, () => {
  console.log(`API Punto Bianco pornit pe http://localhost:${PORT}`);
});
