// Rulează înaintea fiecărui fișier de test.
// Local se încarcă backend/.env (baza Neon "dev", SEED_PASSWORD).
// Pe GitHub Actions nu există .env: testele de bază de date se sar automat.
import 'dotenv/config';

process.env.JWT_SECRET ||= 'secret-doar-pentru-teste';
