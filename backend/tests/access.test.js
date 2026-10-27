// Matricea rol × rută: fiecare rol încearcă fiecare rută protejată, prin aplicația reală (HTTP).
// Baza de date e simulată, deci testul rulează și în CI, fără Neon.
// Unde rolul are acces, cererea trece de verificarea rolului și ajunge la validare (400)
// sau la listă (200); unde nu are acces -> 403.
import { beforeAll, describe, expect, it, vi } from 'vitest';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { createApp } from '../src/app.js';

const ROLES = ['ADMIN', 'COORDONATOR', 'BACK_OFFICE', 'MANAGER_CAZARI', 'SOFER', 'CONTABIL', 'CONTROL_CALITATE'];

// id-ul utilizatorului = poziția rolului + 1
const db = vi.hoisted(() => ({ users: {} }));
vi.mock('../src/lib/prisma.js', () => ({
  default: {
    user: { findUnique: async ({ where }) => db.users[where.id] ?? null },
    visit: { findMany: async () => [] },
    accommodation: { findMany: async () => [] },
  },
}));

ROLES.forEach((role, index) => {
  const id = index + 1;
  db.users[id] = { id, email: `${role.toLowerCase()}@puntobianco.demo`, fullName: role, role, active: true };
});

const tokenOf = (role) => jwt.sign({ role }, process.env.JWT_SECRET, { subject: String(ROLES.indexOf(role) + 1) });

// allowed: cine are acces (ADMIN are mereu); status: ce primește cine are acces
const ROUTES = [
  { method: 'get', path: '/api/visits', allowed: ['COORDONATOR', 'BACK_OFFICE', 'CONTABIL', 'CONTROL_CALITATE'], status: 200 },
  // id invalid -> 400 abia după verificarea rolului
  { method: 'get', path: '/api/visits/abc', allowed: ['COORDONATOR', 'BACK_OFFICE', 'MANAGER_CAZARI', 'CONTABIL', 'CONTROL_CALITATE'], status: 400 },
  // corp gol -> 400 la validare, care vine după verificarea rolului
  { method: 'post', path: '/api/visits', allowed: ['COORDONATOR'], status: 400 },
  { method: 'patch', path: '/api/visits/1/back-office-status', allowed: ['BACK_OFFICE'], status: 400 },
  { method: 'get', path: '/api/accommodations', allowed: ['MANAGER_CAZARI', 'CONTABIL', 'CONTROL_CALITATE'], status: 200 },
  { method: 'patch', path: '/api/accommodations/1/status', allowed: ['MANAGER_CAZARI'], status: 400 },
  // fără from/to -> 400
  { method: 'get', path: '/api/transfers', allowed: ['SOFER', 'CONTABIL', 'CONTROL_CALITATE'], status: 400 },
];

const CASES = ROUTES.flatMap((route) =>
  ROLES.map((role) => {
    const hasAccess = role === 'ADMIN' || route.allowed.includes(role);
    return [`${route.method.toUpperCase()} ${route.path}`, role, hasAccess ? route.status : 403, route];
  }),
);

let app;
beforeAll(() => {
  app = createApp();
});

describe('matricea rol × rută', () => {
  it.each(CASES)('%s · %s -> %i', async (_name, role, expected, route) => {
    const req = request(app)[route.method](route.path).set('Authorization', `Bearer ${tokenOf(role)}`);
    const res = route.method === 'get' ? await req : await req.send({});
    expect(res.status).toBe(expected);
  });

  it('exemple din cerință: șoferul și managerul de cazări nu văd lista vizitelor', async () => {
    for (const role of ['SOFER', 'MANAGER_CAZARI']) {
      const res = await request(app).get('/api/visits').set('Authorization', `Bearer ${tokenOf(role)}`);
      expect(res.status).toBe(403);
      expect(res.body).toEqual({ error: 'Nu ai acces la această acțiune' });
    }
  });

  it('contabilul și controlul calității nu pot modifica nimic, nici pe rute deschise tuturor', async () => {
    for (const role of ['CONTABIL', 'CONTROL_CALITATE']) {
      const res = await request(app)
        .post('/api/notifications/read-all')
        .set('Authorization', `Bearer ${tokenOf(role)}`);
      expect(res.status).toBe(403);
      expect(res.body).toEqual({ error: 'Rolul tău are acces doar la citire' });
    }
  });
});
