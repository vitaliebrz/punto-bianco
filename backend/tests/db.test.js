// Teste de integrare pe baza de date Neon "dev", cu datele din seed (npm run seed).
// Doar CITESC din bază. Se sar automat dacă lipsesc DATABASE_URL sau SEED_PASSWORD
// (ex. pe GitHub Actions, unde secretele bazei nu sunt disponibile).
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import prisma from '../src/lib/prisma.js';

const hasDb = Boolean(process.env.DATABASE_URL && process.env.SEED_PASSWORD);
const PASSWORD = process.env.SEED_PASSWORD;

const ACCOUNTS = [
  ['admin', 'Elena Popescu', 'ADMIN'],
  ['coordonator1', 'Ana Ciobanu', 'COORDONATOR'],
  ['coordonator2', 'Mihai Rusu', 'COORDONATOR'],
  ['backoffice', 'Irina Lungu', 'BACK_OFFICE'],
  ['cazari', 'Victor Munteanu', 'MANAGER_CAZARI'],
  ['sofer1', 'Andrei Cojocaru', 'SOFER'],
  ['sofer2', 'Sergiu Botnaru', 'SOFER'],
  ['contabil', 'Natalia Ceban', 'CONTABIL'],
  ['calitate', 'Olga Moraru', 'CONTROL_CALITATE'],
];

describe.skipIf(!hasDb)('integrare cu baza de date (seed)', () => {
  let app;
  const tokens = {};

  const login = (email, password) =>
    request(app).post('/api/auth/login').send({ email, password });

  beforeAll(async () => {
    app = createApp();
    for (const [name] of ACCOUNTS) {
      const res = await login(`${name}@puntobianco.demo`, PASSWORD);
      tokens[name] = res.body.token;
    }
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it.each(ACCOUNTS)('login %s -> %s / %s', async (name, fullName, role) => {
    const res = await login(`${name}@puntobianco.demo`, PASSWORD);
    expect(res.status).toBe(200);
    expect(res.body.token).toEqual(expect.any(String));
    expect(res.body.user).toMatchObject({ email: `${name}@puntobianco.demo`, fullName, role });
  });

  it('email cu majuscule și spații funcționează', async () => {
    const res = await login('  ADMIN@PuntoBianco.demo ', PASSWORD);
    expect(res.status).toBe(200);
  });

  it('parolă greșită -> 401 cu mesaj generic', async () => {
    const res = await login('admin@puntobianco.demo', 'parola-gresita');
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: 'Email sau parolă greșite' });
  });

  it('email inexistent -> același mesaj ca la parolă greșită', async () => {
    const res = await login('nimeni@puntobianco.demo', 'parola-gresita');
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: 'Email sau parolă greșite' });
  });

  it('passwordHash nu apare niciodată în răspunsuri', async () => {
    const loginRes = await login('admin@puntobianco.demo', PASSWORD);
    const meRes = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${tokens.admin}`);
    expect(JSON.stringify(loginRes.body)).not.toMatch(/passwordHash/);
    expect(JSON.stringify(meRes.body)).not.toMatch(/passwordHash/);
  });

  it('GET /api/auth/me întoarce utilizatorul token-ului', async () => {
    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${tokens.sofer1}`);
    expect(res.status).toBe(200);
    expect(res.body.user).toMatchObject({ fullName: 'Andrei Cojocaru', role: 'SOFER' });
  });

  it('GET /api/users/coordinators -> cei 2 coordonatori, fără alte date', async () => {
    const res = await request(app)
      .get('/api/users/coordinators')
      .set('Authorization', `Bearer ${tokens.backoffice}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual([
      { id: expect.any(Number), fullName: 'Ana Ciobanu' },
      { id: expect.any(Number), fullName: 'Mihai Rusu' },
    ]);
  });

  it.each(['contabil', 'calitate'])('%s poate citi lista de coordonatori', async (name) => {
    const res = await request(app)
      .get('/api/users/coordinators')
      .set('Authorization', `Bearer ${tokens[name]}`);
    expect(res.status).toBe(200);
  });

  it.each(['contabil', 'calitate'])('%s nu poate modifica nimic (POST -> 403)', async (name) => {
    const res = await request(app)
      .post('/api/users/coordinators')
      .set('Authorization', `Bearer ${tokens[name]}`)
      .send({});
    expect(res.status).toBe(403);
    expect(res.body.error).toBe('Rolul tău are acces doar la citire');
  });
});
