// Teste HTTP pe aplicația reală, fără server pornit și fără baza de date.
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';

const FRONTEND = 'https://punto.example';

let app;
beforeEach(() => {
  process.env.FRONTEND_URL = `${FRONTEND}/`; // cu "/" la final, intenționat
  delete process.env.TRUST_PROXY;
  app = createApp(); // aplicație nouă = contor nou pentru limita de încercări
});
afterEach(() => {
  delete process.env.TRUST_PROXY;
});

// Cerere de login care eșuează la validare (400) — nu atinge baza de date
const badLogin = (agent, headers = {}) =>
  agent.post('/api/auth/login').set(headers).send({ email: 'nu-e-email', password: 'x' });

describe('rute de bază', () => {
  it('GET /api/health -> 200', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });

  it('rută inexistentă -> 404', async () => {
    const res = await request(app).get('/api/nu-exista');
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Rută inexistentă');
  });
});

describe('POST /api/auth/login — date de intrare', () => {
  it.each([
    ['câmp în plus', { email: 'a@b.co', password: 'x', role: 'ADMIN' }],
    ['email ca obiect', { email: { contains: '@' }, password: 'x' }],
    ['parolă ca număr', { email: 'a@b.co', password: 123 }],
    ['corp gol', {}],
  ])('%s -> 400 cu mesaj generic', async (_name, body) => {
    const res = await request(app).post('/api/auth/login').send(body);
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'Date de autentificare invalide' });
  });

  it('date trimise ca formular (nu JSON) -> 400', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .type('form')
      .send('email=a@b.co&password=x');
    expect(res.status).toBe(400);
  });

  it('JSON stricat -> 400', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .set('Content-Type', 'application/json')
      .send('{"email": ');
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('JSON invalid');
  });

  it('corp peste 10 KB -> 413', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'a@b.co', password: 'x'.repeat(20000) });
    expect(res.status).toBe(413);
  });
});

describe('rute protejate fără token', () => {
  it.each([
    '/api/auth/me',
    '/api/users/coordinators',
    '/api/visits',
    '/api/visits/1',
    '/api/accommodations',
    '/api/transfers',
    '/api/notifications',
  ])('GET %s -> 401', async (path) => {
    const res = await request(app).get(path);
    expect(res.status).toBe(401);
  });

  it.each([
    ['post', '/api/visits'],
    ['patch', '/api/visits/1/back-office-status'],
    ['patch', '/api/accommodations/1/status'],
    ['patch', '/api/notifications/1/read'],
    ['post', '/api/notifications/read-all'],
  ])('%s %s -> 401', async (method, path) => {
    const res = await request(app)[method](path).send({});
    expect(res.status).toBe(401);
  });
});

describe('limita de încercări la login', () => {
  it('a 11-a încercare eșuată -> 429', async () => {
    for (let i = 0; i < 10; i++) {
      expect((await badLogin(request(app))).status).toBe(400);
    }
    const res = await badLogin(request(app));
    expect(res.status).toBe(429);
    expect(res.body.error).toMatch(/Prea multe încercări/);
  });

  it('NU poate fi ocolită cu un X-Forwarded-For fals (fără TRUST_PROXY)', async () => {
    const statuses = [];
    for (let i = 0; i < 15; i++) {
      statuses.push((await badLogin(request(app), { 'X-Forwarded-For': `10.0.0.${i}` })).status);
    }
    expect(statuses.filter((s) => s === 429)).toHaveLength(5);
  });

  it('cu TRUST_PROXY, IP-ul din X-Forwarded-For e folosit (contoare separate)', async () => {
    process.env.TRUST_PROXY = '1';
    const proxied = createApp();
    for (let i = 0; i < 10; i++) {
      await badLogin(request(proxied), { 'X-Forwarded-For': '10.0.0.1' });
    }
    expect((await badLogin(request(proxied), { 'X-Forwarded-For': '10.0.0.1' })).status).toBe(429);
    expect((await badLogin(request(proxied), { 'X-Forwarded-For': '10.0.0.2' })).status).toBe(400);
  });
});

describe('CORS și header-e de securitate', () => {
  it('permite doar FRONTEND_URL (fără "/" la final)', async () => {
    const res = await request(app).get('/api/health').set('Origin', FRONTEND);
    expect(res.headers['access-control-allow-origin']).toBe(FRONTEND);
  });

  it('preflight de la frontend -> 204 cu origin-ul corect', async () => {
    const res = await request(app)
      .options('/api/auth/login')
      .set('Origin', FRONTEND)
      .set('Access-Control-Request-Method', 'POST')
      .set('Access-Control-Request-Headers', 'content-type');
    expect(res.status).toBe(204);
    expect(res.headers['access-control-allow-origin']).toBe(FRONTEND);
  });

  it('alt site nu primește permisiune', async () => {
    const res = await request(app).get('/api/health').set('Origin', 'https://atacator.example');
    expect(res.headers['access-control-allow-origin']).not.toBe('https://atacator.example');
  });

  it('header-ele helmet sunt prezente, X-Powered-By lipsește', async () => {
    const res = await request(app).get('/api/health');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-frame-options']).toBe('SAMEORIGIN');
    expect(res.headers['strict-transport-security']).toBeDefined();
    expect(res.headers['content-security-policy']).toBeDefined();
    expect(res.headers['x-powered-by']).toBeUndefined();
  });
});
