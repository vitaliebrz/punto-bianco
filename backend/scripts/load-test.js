// Test de încărcare: N utilizatori (implicit 50) conectați în același timp, cu toate rolurile.
// Plan: docs/planuri/06-test-incarcare.md
//
// Rulare (cu backend-ul pornit):  npm run load-test
// Parametri (variabile de mediu):
//   LOAD_BASE_URL  adresa API-ului (implicit http://localhost:3000)
//   LOAD_USERS     câți utilizatori virtuali (implicit 50)
//   LOAD_DURATION  câte secunde lucrează (implicit 60)
//   LOAD_WRITES    1 = înregistrează vizite și apasă butoanele de status (implicit: 1 doar pe localhost)
//
// Datele create sunt marcate (numele de familie al pacientului = MARKER) și șterse la final, prin Prisma,
// din baza din backend/.env. Datele demo nu sunt atinse.
import 'dotenv/config';

const BASE_URL = (process.env.LOAD_BASE_URL || 'http://localhost:3000').replace(/\/+$/, '');
const USERS = Number(process.env.LOAD_USERS || 50);
const DURATION_S = Number(process.env.LOAD_DURATION || 60);
const IS_LOCAL = /^https?:\/\/(localhost|127\.0\.0\.1|192\.168\.)/.test(BASE_URL);
const WRITES = (process.env.LOAD_WRITES ?? (IS_LOCAL ? '1' : '0')) === '1';
const PASSWORD = process.env.SEED_PASSWORD;
const MARKER = 'TestIncarcare';
const REQUEST_TIMEOUT_MS = 15000;
const NOTIFICATION_POLL_MS = 30000; // ca în aplicație (clopoțelul)

// Rolurile celor 50 de utilizatori (ca într-o zi obișnuită la clinică) și conturile demo folosite
const PROFILE = [
  ...Array(10).fill(['COORDONATOR', ['coordonator1', 'coordonator2']]),
  ...Array(10).fill(['BACK_OFFICE', ['backoffice']]),
  ...Array(8).fill(['MANAGER_CAZARI', ['cazari']]),
  ...Array(8).fill(['SOFER', ['sofer1', 'sofer2']]),
  ...Array(6).fill(['CONTABIL', ['contabil']]),
  ...Array(4).fill(['CONTROL_CALITATE', ['calitate']]),
  ...Array(4).fill(['ADMIN', ['admin']]),
];

const FIRST_NAMES = ['Luca', 'Hanna', 'Oliver', 'Chloé', 'Noam', 'Emma', 'Matteo', 'Sofia', 'Jonas', 'Léa'];
const APARTMENTS = ['STUDIO', 'UN_DORMITOR_DIVAN', 'DOUA_DORMITOARE', 'DOUA_DORMITOARE_LIVING'];
const DIRECTIONS = ['SOSIRE', 'PLECARE', 'DUS_INTORS'];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const pick = (list) => list[Math.floor(Math.random() * list.length)];
const DAY_MS = 24 * 60 * 60 * 1000;

// ---------- Statistici ----------

const stats = new Map(); // "GET /api/visits" -> { times: [], ok, conflicts, errors, samples }
let stopping = false;

function record(key, ms, status, { allowConflict = false, error } = {}) {
  if (!stats.has(key)) stats.set(key, { times: [], ok: 0, conflicts: 0, errors: 0, samples: [] });
  const entry = stats.get(key);
  entry.times.push(ms);
  if (status >= 200 && status < 300) entry.ok++;
  else if (status === 409 && allowConflict) entry.conflicts++;
  else {
    entry.errors++;
    if (entry.samples.length < 3) entry.samples.push(error ? `rețea: ${error}` : `HTTP ${status}`);
  }
}

const percentile = (sorted, p) =>
  sorted.length === 0 ? 0 : sorted[Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1)];

async function request(key, method, path, { token, body, allowConflict } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body) headers['Content-Type'] = 'application/json';
  const started = performance.now();
  try {
    const res = await fetch(BASE_URL + path, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    const data = res.status === 204 ? null : await res.json().catch(() => null);
    record(key, performance.now() - started, res.status, { allowConflict });
    return { status: res.status, data };
  } catch (err) {
    record(key, performance.now() - started, 0, { error: err.name === 'TimeoutError' ? 'timeout' : err.message });
    return { status: 0, data: null };
  }
}

// ---------- Date create de test (comune tuturor utilizatorilor) ----------

const shared = {
  coordinatorIds: [],
  visitIds: [], // toate vizitele văzute (pentru „detalii”)
  testVisits: [], // { id, status } create de test, pentru Back office
  testAccommodations: [], // { id, status } create de test, pentru Manager cazări
};

function visitPayload() {
  const arrival = new Date(Date.now() + (30 + Math.floor(Math.random() * 30)) * DAY_MS);
  arrival.setUTCHours(8 + Math.floor(Math.random() * 10), pick([0, 15, 30, 45]), 0, 0);
  const departure = new Date(arrival.getTime() + (3 + Math.floor(Math.random() * 7)) * DAY_MS);
  const withAccommodation = Math.random() < 0.7;
  const free = Math.random() < 0.5;
  return {
    patient: { firstName: pick(FIRST_NAMES), lastName: MARKER, treatment: 'Test de încărcare', availability: null },
    companion: Math.random() < 0.3 ? { firstName: pick(FIRST_NAMES), lastName: MARKER } : null,
    arrivalAt: arrival.toISOString(),
    departureAt: departure.toISOString(),
    coordinatorId: pick(shared.coordinatorIds),
    accommodation: withAccommodation
      ? { apartmentType: pick(APARTMENTS), isFree: free, ...(free && { freeDays: 1 + Math.floor(Math.random() * 5) }) }
      : null,
    transfer: Math.random() < 0.7 ? { isFree: Math.random() < 0.5, direction: pick(DIRECTIONS) } : null,
  };
}

function weekRange() {
  const from = new Date();
  from.setUTCHours(0, 0, 0, 0);
  const to = new Date(from.getTime() + 7 * DAY_MS);
  return `from=${from.toISOString()}&to=${to.toISOString()}`;
}

// ---------- Acțiunile fiecărui rol ----------

const listVisits = async (user) => {
  const { data } = await request('GET /api/visits', 'GET', '/api/visits', { token: user.token });
  if (Array.isArray(data) && shared.visitIds.length === 0) shared.visitIds.push(...data.map((visit) => visit.id));
};
const visitDetails = (user) => {
  // ca în aplicație: detaliile se deschid din listă, deci întâi trebuie știută lista
  if (shared.visitIds.length === 0) return listVisits(user);
  return request('GET /api/visits/:id', 'GET', `/api/visits/${pick(shared.visitIds)}`, { token: user.token });
};
const listAccommodations = (user) =>
  request('GET /api/accommodations', 'GET', '/api/accommodations', { token: user.token });
const transfers = (user) => request('GET /api/transfers', 'GET', `/api/transfers?${weekRange()}`, { token: user.token });
const coordinators = (user) => request('GET /api/users/coordinators', 'GET', '/api/users/coordinators', { token: user.token });

async function createVisit(user) {
  const { status, data } = await request('POST /api/visits', 'POST', '/api/visits', {
    token: user.token,
    body: visitPayload(),
  });
  if (status === 201 && data) {
    shared.visitIds.push(data.id);
    shared.testVisits.push({ id: data.id, status: data.backOfficeStatus });
    if (data.accommodation) shared.testAccommodations.push({ id: data.accommodation.id, status: data.accommodation.status });
  }
}

async function backOfficeStep(user) {
  const visit = pick(shared.testVisits.filter((item) => item.status !== 'FINALIZAT'));
  if (!visit) return listVisits(user);
  const next = visit.status === 'NEPRELUAT' ? 'INCEPUT' : 'FINALIZAT';
  const { status } = await request('PATCH /api/visits/:id/back-office-status', 'PATCH', `/api/visits/${visit.id}/back-office-status`, {
    token: user.token,
    body: { status: next },
    allowConflict: true, // alt utilizator Back office a apăsat primul: răspuns corect
  });
  if (status === 200) visit.status = next;
}

async function reserveStep(user) {
  const accommodation = pick(shared.testAccommodations.filter((item) => item.status === 'NEPRELUCRAT'));
  if (!accommodation) return listAccommodations(user);
  const { status } = await request('PATCH /api/accommodations/:id/status', 'PATCH', `/api/accommodations/${accommodation.id}/status`, {
    token: user.token,
    body: { status: 'REZERVAT' },
    allowConflict: true,
  });
  if (status === 200 || status === 409) accommodation.status = 'REZERVAT';
}

// Fiecare rol: listă de [acțiune, pondere]; scrierile doar cu LOAD_WRITES=1
const ACTIONS = {
  COORDONATOR: [[listVisits, 3], [coordinators, 1], [visitDetails, 2], ...(WRITES ? [[createVisit, 2]] : [])],
  BACK_OFFICE: [[listVisits, 3], [visitDetails, 1], ...(WRITES ? [[backOfficeStep, 2]] : [])],
  MANAGER_CAZARI: [[listAccommodations, 3], [visitDetails, 1], ...(WRITES ? [[reserveStep, 2]] : [])],
  SOFER: [[transfers, 1]],
  CONTABIL: [[listVisits, 2], [listAccommodations, 1], [transfers, 1], [visitDetails, 1]],
  CONTROL_CALITATE: [[listVisits, 2], [listAccommodations, 1], [transfers, 1], [visitDetails, 1]],
  ADMIN: [[listVisits, 2], [listAccommodations, 1], [transfers, 1], [visitDetails, 1]],
};

function pickAction(role) {
  const actions = ACTIONS[role];
  let roll = Math.random() * actions.reduce((sum, [, weight]) => sum + weight, 0);
  for (const [action, weight] of actions) {
    roll -= weight;
    if (roll <= 0) return action;
  }
  return actions[0][0];
}

async function runUser(user, endAt) {
  let lastPoll = 0;
  while (!stopping && Date.now() < endAt) {
    if (Date.now() - lastPoll >= NOTIFICATION_POLL_MS) {
      lastPoll = Date.now();
      await request('GET /api/notifications', 'GET', '/api/notifications', { token: user.token });
    } else {
      await pickAction(user.role)(user);
    }
    await sleep(1000 + Math.random() * 2000); // pauza unui om între două clicuri
  }
}

// ---------- Curățenie ----------

let prisma = null;

async function cleanup() {
  if (!prisma) return null;
  const where = { patients: { some: { lastName: MARKER } } };
  const { count } = await prisma.visit.deleteMany({ where });
  const remaining = await prisma.visit.count({ where });
  return { deleted: count, remaining };
}

// ---------- Raport ----------

function report(totalMs) {
  const rows = [...stats.entries()].sort(([a], [b]) => a.localeCompare(b));
  const pad = (value, width) => String(value).padStart(width);
  console.log('\nRută'.padEnd(46) + pad('cereri', 7) + pad('erori', 7) + pad('409', 6) + pad('p50', 8) + pad('p95', 8) + pad('p99', 8) + pad('max', 8));
  let total = 0;
  let errors = 0;
  // cel mai mare p95 pe tip de cerere: citiri (GET) și scrieri (POST/PATCH, fără login, măsurat separat)
  const worstP95ByKind = { read: 0, write: 0 };
  for (const [key, entry] of rows) {
    const sorted = [...entry.times].sort((a, b) => a - b);
    const p95 = percentile(sorted, 95);
    const kind = key.startsWith('GET') ? 'read' : key.startsWith('POST /api/auth/login') ? null : 'write';
    if (kind) worstP95ByKind[kind] = Math.max(worstP95ByKind[kind], p95);
    total += entry.times.length;
    errors += entry.errors;
    console.log(
      key.padEnd(45) +
        pad(entry.times.length, 7) +
        pad(entry.errors, 7) +
        pad(entry.conflicts, 6) +
        pad(`${Math.round(percentile(sorted, 50))}ms`, 8) +
        pad(`${Math.round(p95)}ms`, 8) +
        pad(`${Math.round(percentile(sorted, 99))}ms`, 8) +
        pad(`${Math.round(sorted.at(-1) ?? 0)}ms`, 8),
    );
    for (const sample of entry.samples) console.log(`   ↳ ${sample}`);
  }
  console.log(`\nTotal: ${total} cereri în ${(totalMs / 1000).toFixed(1)} s (${(total / (totalMs / 1000)).toFixed(1)} cereri/s), erori: ${errors}`);
  return { total, errors, worstP95ByKind };
}

// ---------- Rulare ----------

async function main() {
  if (!PASSWORD) throw new Error('Lipsește SEED_PASSWORD în backend/.env (parola conturilor demo).');
  if (WRITES && process.env.NODE_ENV === 'production') throw new Error('Scrierile nu sunt permise cu NODE_ENV=production.');

  console.log(`Test de încărcare: ${USERS} utilizatori, ${DURATION_S} s, API ${BASE_URL}, scrieri: ${WRITES ? 'DA' : 'nu'}`);
  const health = await request('GET /api/health', 'GET', '/api/health');
  if (health.status !== 200) throw new Error(`API-ul nu răspunde la ${BASE_URL}/api/health`);

  if (WRITES) {
    prisma = (await import('../src/lib/prisma.js')).default;
    console.log(`Baza de date pentru curățenie: ${new URL(process.env.DATABASE_URL).host}`);
    const leftovers = await cleanup();
    if (leftovers.deleted > 0) console.log(`Șterse ${leftovers.deleted} vizite rămase de la o rulare anterioară.`);
  }

  // 1. Toți intră în cont în aceeași secundă
  const users = Array.from({ length: USERS }, (_, index) => {
    const [role, accounts] = PROFILE[index % PROFILE.length];
    return { role, email: `${accounts[index % accounts.length]}@puntobianco.demo` };
  });
  let started = performance.now();
  const logins = await Promise.all(
    users.map((user) => request('POST /api/auth/login', 'POST', '/api/auth/login', { body: { email: user.email, password: PASSWORD } })),
  );
  logins.forEach((login, index) => (users[index].token = login.data?.token));
  const loggedIn = users.filter((user) => user.token);
  console.log(`\n1) Login simultan: ${loggedIn.length}/${USERS} reușite în ${Math.round(performance.now() - started)} ms`);
  if (loggedIn.length === 0) throw new Error('Niciun login reușit.');

  // Ca în aplicație după login: /me; coordonatorii încarcă lista de coordonatori
  await Promise.all(loggedIn.map((user) => request('GET /api/auth/me', 'GET', '/api/auth/me', { token: user.token })));
  const coordinatorList = await coordinators(loggedIn[0]);
  shared.coordinatorIds = (coordinatorList.data ?? []).map((coordinator) => coordinator.id);

  // 2. Lucru continuu, în paralel
  console.log(`2) Lucru simultan timp de ${DURATION_S} s…`);
  started = performance.now();
  const endAt = Date.now() + DURATION_S * 1000;
  const progress = setInterval(() => {
    const done = [...stats.values()].reduce((sum, entry) => sum + entry.times.length, 0);
    console.log(`   ${Math.round((performance.now() - started) / 1000)} s: ${done} cereri până acum`);
  }, 10000);
  await Promise.all(loggedIn.map((user) => runUser(user, endAt)));
  clearInterval(progress);
  const steadyMs = performance.now() - started;

  // 3. Vârf: toți deschid în același moment pagina lor principală
  //    (șoferul nu are acces la lista vizitelor: el deschide calendarul, managerul de cazări cazările)
  const HOME = {
    SOFER: ['GET /api/transfers (vârf simultan)', () => `/api/transfers?${weekRange()}`],
    MANAGER_CAZARI: ['GET /api/accommodations (vârf simultan)', () => '/api/accommodations'],
  };
  started = performance.now();
  await Promise.all(
    loggedIn.map((user) => {
      const [key, path] = HOME[user.role] ?? ['GET /api/visits (vârf simultan)', () => '/api/visits'];
      return request(key, 'GET', path(), { token: user.token });
    }),
  );
  console.log(`3) Vârf: ${loggedIn.length} cereri simultane (pagina principală a fiecăruia) în ${Math.round(performance.now() - started)} ms`);

  const { errors, worstP95ByKind } = report(steadyMs);
  console.log(`Vizite create de test: ${shared.testVisits.length}, cereri de cazare create: ${shared.testAccommodations.length}`);

  const checks = [
    [`toate login-urile simultane reușite (${loggedIn.length}/${USERS})`, loggedIn.length === USERS],
    [`0 erori (${errors})`, errors === 0],
    [`citiri (GET): p95 sub 1000 ms (cel mai mare: ${Math.round(worstP95ByKind.read)} ms)`, worstP95ByKind.read < 1000],
    [`scrieri (POST/PATCH): p95 sub 2000 ms (cel mai mare: ${Math.round(worstP95ByKind.write)} ms)`, worstP95ByKind.write < 2000],
  ];
  return checks;
}

async function finish(checks, failure) {
  const result = await cleanup().catch((err) => ({ error: err.message }));
  if (result?.error) console.log(`\nCurățenie EȘUATĂ: ${result.error}`);
  else if (result) {
    console.log(`\nCurățenie: ${result.deleted} vizite de test șterse (cu persoanele, cazarea, transferul și notificările lor); rămase: ${result.remaining}`);
    checks.push([`datele de test șterse (rămase: ${result.remaining})`, result.remaining === 0]);
  }
  await prisma?.$disconnect();

  if (failure) console.log(`\nTestul s-a oprit: ${failure.message}`);
  console.log('\nRezultat:');
  for (const [label, ok] of checks) console.log(`  ${ok ? 'OK  ' : 'EȘEC'} ${label}`);
  process.exit(!failure && checks.every(([, ok]) => ok) ? 0 : 1);
}

// Ctrl+C: oprește utilizatorii și curăță datele înainte de ieșire
process.on('SIGINT', () => {
  if (stopping) return;
  stopping = true;
  console.log('\nOprit (Ctrl+C), curăț datele de test…');
  finish([], new Error('oprit manual'));
});

main()
  .then((checks) => finish(checks))
  .catch((err) => finish([], err));
