import 'dotenv/config';
import { createApp } from './app.js';

if (!process.env.JWT_SECRET) {
  console.error('Lipsește JWT_SECRET în .env');
  process.exit(1);
}

const PORT = process.env.PORT || 3000;

createApp().listen(PORT, () => {
  console.log(`API Punto Bianco pornit pe http://localhost:${PORT}`);
});
