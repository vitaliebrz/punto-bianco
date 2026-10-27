// Test de integrare pentru gestionarea utilizatorilor, pe baza Neon "dev".
// SCRIE în bază: creează conturi de test (test-utilizator-…@puntobianco.test) și le ȘTERGE la final
// (și la pornire, dacă au rămas de la o rulare întreruptă). Conturile din seed nu sunt modificate.
// Se sare automat fără SEED_PASSWORD sau DB_WRITE_HOST (vezi src/lib/dbWriteGuard.js).
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { dbWriteCheck } from '../src/lib/dbWriteGuard.js';
import prisma from '../src/lib/prisma.js';

const hasDb = Boolean(process.env.SEED_PASSWORD) && dbWriteCheck().allowed;
const testUsersWhere = { email: { startsWith: 'test-utilizator-', endsWith: '@puntobianco.test' } };
const PASSWORD = 'ParolaTest123';

describe.skipIf(!hasDb)('gestionarea utilizatorilor (scrie în baza dev, apoi curăță)', () => {
  let app;
  let adminToken;
  let admin;

  const asAdmin = (method, path) => request(app)[method](path).set('Authorization', `Bearer ${adminToken}`);
  const login = (email, password = PASSWORD) => request(app).post('/api/auth/login').send({ email, password });
  const createUser = (fields) =>
    asAdmin('post', '/api/users').send({ fullName: 'Coleg Test', password: PASSWORD, role: 'BACK_OFFICE', ...fields });
  const setActive = (id, active) => asAdmin('patch', `/api/users/${id}/active`).send({ active });

  beforeAll(async () => {
    await prisma.user.deleteMany({ where: testUsersWhere });
    app = createApp();
    const res = await login('admin@puntobianco.demo', process.env.SEED_PASSWORD);
    adminToken = res.body.token;
    admin = res.body.user;
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: testUsersWhere });
    await prisma.$disconnect();
  });

  describe('cont nou de Back office', () => {
    const email = 'test-utilizator-backoffice@puntobianco.test';
    let user;

    beforeAll(async () => {
      const res = await createUser({ email: 'Test-Utilizator-BackOffice@PuntoBianco.test' });
      expect(res.status).toBe(201);
      user = res.body;
    });

    it('e creat activ, cu emailul cu litere mici; răspunsul nu conține parola sau hash-ul', async () => {
      expect(user).toMatchObject({ email, fullName: 'Coleg Test', role: 'BACK_OFFICE', active: true });
      expect(user).not.toHaveProperty('passwordHash');
      expect(user).not.toHaveProperty('password');
      const row = await prisma.user.findUnique({ where: { id: user.id }, select: { passwordHash: true } });
      expect(row.passwordHash).toMatch(/^\$2[aby]\$10\$/); // hash bcrypt, nu parola
    });

    it('apare în lista Admin-ului', async () => {
      const res = await asAdmin('get', '/api/users');
      expect(res.status).toBe(200);
      expect(res.body.find((item) => item.id === user.id)).toMatchObject({ email, active: true });
      expect(res.body.every((item) => !('passwordHash' in item))).toBe(true);
    });

    it('poate intra în aplicație cu parola primită de la Admin', async () => {
      const res = await login(email);
      expect(res.status).toBe(200);
      expect(res.body.user).toMatchObject({ email, role: 'BACK_OFFICE' });
    });

    it('același email (scris altfel) -> 409', async () => {
      const res = await createUser({ email: 'TEST-utilizator-backoffice@puntobianco.test' });
      expect(res.status).toBe(409);
      expect(res.body.details).toEqual([{ field: 'email', message: 'Există deja un cont cu acest email' }]);
    });

    it('dezactivat: login refuzat, iar token-ul primit înainte nu mai merge', async () => {
      const oldToken = (await login(email)).body.token;

      const res = await setActive(user.id, false);
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ id: user.id, active: false });

      expect((await login(email)).status).toBe(401);
      const me = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${oldToken}`);
      expect(me.status).toBe(401);
    });

    it('reactivat: poate intra din nou', async () => {
      expect((await setActive(user.id, true)).body).toMatchObject({ active: true });
      expect((await login(email)).status).toBe(200);
    });
  });

  it('un coordonator dezactivat dispare din lista „Coordonator responsabil”', async () => {
    const created = await createUser({ email: 'test-utilizator-coordonator@puntobianco.test', role: 'COORDONATOR' });
    expect(created.status).toBe(201);
    const coordinatorIds = async () => (await asAdmin('get', '/api/users/coordinators')).body.map((c) => c.id);

    expect(await coordinatorIds()).toContain(created.body.id);
    await setActive(created.body.id, false);
    expect(await coordinatorIds()).not.toContain(created.body.id);
  });

  it('Admin-ul nu se poate dezactiva pe sine și rămâne activ', async () => {
    const res = await setActive(admin.id, false);
    expect(res.status).toBe(400);
    const row = await prisma.user.findUnique({ where: { id: admin.id }, select: { active: true } });
    expect(row.active).toBe(true);
  });

  it('utilizator inexistent -> 404', async () => {
    expect((await setActive(999999, false)).status).toBe(404);
  });
});
