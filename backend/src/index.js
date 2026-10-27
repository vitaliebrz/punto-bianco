import 'dotenv/config';
import { createApp } from './app.js';
import { jwtSecretProblem } from './config.js';
import prisma from './lib/prisma.js';

// Setările greșite opresc pornirea cu un mesaj clar (în log-ul de pe Render)
const secretProblem = jwtSecretProblem();
if (secretProblem) {
  console.error(secretProblem);
  process.exit(1);
}

let app;
try {
  app = createApp();
} catch (err) {
  console.error(err.message);
  process.exit(1);
}

const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => {
  console.log(`API Punto Bianco pornit pe portul ${PORT}`);
});

// Oprire curată: Render trimite SIGTERM la fiecare republicare (Ctrl+C local = SIGINT).
// Nu mai primim cereri noi, le terminăm pe cele în curs, apoi închidem conexiunea la bază.
const SHUTDOWN_TIMEOUT_MS = 10000;
let stopping = false;

function shutdown(signal) {
  if (stopping) return;
  stopping = true;
  console.log(`${signal}: se oprește serverul…`);
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
  // O cerere agățată nu are voie să blocheze oprirea
  setTimeout(() => process.exit(1), SHUTDOWN_TIMEOUT_MS).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
