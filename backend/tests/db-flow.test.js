// Test de integrare pentru fluxul vizitei (Pasul 1 + Pasul 2 din cerință), pe baza Neon "dev".
// SCRIE în bază: creează vizite de test și le ȘTERGE la final (notificările lor se șterg în cascadă).
// Datele din seed nu sunt modificate. Se sare automat dacă lipsesc DATABASE_URL sau SEED_PASSWORD.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import prisma from '../src/lib/prisma.js';

const hasDb = Boolean(process.env.DATABASE_URL && process.env.SEED_PASSWORD);
const ACCOUNTS = ['admin', 'coordonator1', 'backoffice', 'cazari', 'sofer1', 'contabil'];
const DAY_MS = 24 * 60 * 60 * 1000;

// Vizitele de test sunt departe în viitor, ca să nu se amestece cu cele din seed.
const arrival = new Date(Date.now() + 200 * DAY_MS);
arrival.setUTCHours(12, 30, 0, 0);
const departure = new Date(arrival.getTime() + 6 * DAY_MS - 4 * 60 * 60 * 1000);

describe.skipIf(!hasDb)('fluxul vizitei (scrie în baza dev, apoi curăță)', () => {
  let app;
  let coordinatorId;
  const tokens = {};
  const createdVisitIds = [];

  const api = (method, path, account) =>
    request(app)[method](path).set('Authorization', `Bearer ${tokens[account]}`);

  function visitPayload(overrides = {}) {
    return {
      patient: {
        firstName: 'Test',
        lastName: 'Flux',
        treatment: 'Implant (test automat)',
        availability: 'După ora 12:00',
      },
      companion: { firstName: 'Însoțitor', lastName: 'Flux', treatment: 'Albire', availability: 'Oricând' },
      arrivalAt: arrival.toISOString(),
      departureAt: departure.toISOString(),
      coordinatorId,
      accommodation: { apartmentType: 'DOUA_DORMITOARE', isFree: true, freeDays: 3 },
      transfer: { isFree: false, direction: 'DUS_INTORS' },
      ...overrides,
    };
  }

  async function createVisit(overrides, account = 'coordonator1') {
    const res = await api('post', '/api/visits', account).send(visitPayload(overrides));
    if (res.status === 201) createdVisitIds.push(res.body.id);
    return res;
  }

  // câte notificări a creat vizita, pe roluri
  async function notificationRoles(visitId) {
    const rows = await prisma.notification.findMany({
      where: { visitId },
      select: { type: true, user: { select: { role: true } } },
    });
    return rows.map((row) => `${row.user.role}:${row.type}`).sort();
  }

  async function activeCount(role) {
    return prisma.user.count({ where: { role, active: true } });
  }

  beforeAll(async () => {
    app = createApp();
    for (const name of ACCOUNTS) {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: `${name}@puntobianco.demo`, password: process.env.SEED_PASSWORD });
      tokens[name] = res.body.token;
    }
    const coordinators = await api('get', '/api/users/coordinators', 'coordonator1');
    coordinatorId = coordinators.body[0].id;
  });

  afterAll(async () => {
    if (createdVisitIds.length > 0) {
      await prisma.visit.deleteMany({ where: { id: { in: createdVisitIds } } });
    }
    await prisma.$disconnect();
  });

  describe('Pasul 1: coordonatorul înregistrează vizita', () => {
    let visit;

    beforeAll(async () => {
      const res = await createVisit();
      expect(res.status).toBe(201);
      visit = res.body;
    });

    it('vizita se salvează cu persoanele, tratamentele, cazarea și transferul', () => {
      expect(visit).toMatchObject({
        hasCompanion: true,
        backOfficeStatus: 'NEPRELUAT',
        coordinator: { id: coordinatorId },
        accommodation: { apartmentType: 'DOUA_DORMITOARE', isFree: true, freeDays: 3, status: 'NEPRELUCRAT' },
        transfer: { isFree: false, direction: 'DUS_INTORS' },
      });
      expect(visit.arrivalAt).toBe(arrival.toISOString());
      expect(visit.patients).toEqual([
        expect.objectContaining({ firstName: 'Test', isCompanion: false, treatment: 'Implant (test automat)' }),
        expect.objectContaining({ firstName: 'Însoțitor', isCompanion: true, treatment: 'Albire' }),
      ]);
    });

    it('în bază: autorul e coordonatorul conectat', async () => {
      const row = await prisma.visit.findUnique({
        where: { id: visit.id },
        select: { createdBy: { select: { email: true } } },
      });
      expect(row.createdBy.email).toBe('coordonator1@puntobianco.demo');
    });

    it('Pasul 2: Back office și Manager cazări primesc notificare, șoferii nu', async () => {
      const roles = await notificationRoles(visit.id);
      const backOffice = await activeCount('BACK_OFFICE');
      const cazari = await activeCount('MANAGER_CAZARI');
      expect(roles).toEqual([
        ...Array(backOffice).fill('BACK_OFFICE:VIZITA_NOUA_BACK_OFFICE'),
        ...Array(cazari).fill('MANAGER_CAZARI:CAZARE_NOUA'),
      ]);
    });

    it('notificarea apare la clopoțelul Back office, necitită', async () => {
      const res = await api('get', '/api/notifications', 'backoffice');
      expect(res.status).toBe(200);
      expect(res.body.unreadCount).toBeGreaterThanOrEqual(1);
      const item = res.body.items.find((n) => n.visitId === visit.id);
      expect(item).toMatchObject({ type: 'VIZITA_NOUA_BACK_OFFICE', readAt: null });
      expect(item.message).toMatch(/^Vizită nouă: Test Flux \(\+ însoțitor\), sosire /);
    });

    it('vizita apare în lista vizitelor, care rămâne ordonată după sosire', async () => {
      const res = await api('get', '/api/visits', 'backoffice');
      expect(res.status).toBe(200);
      expect(res.body.some((v) => v.id === visit.id)).toBe(true);
      const times = res.body.map((v) => new Date(v.arrivalAt).getTime());
      expect(times).toEqual([...times].sort((a, b) => a - b));
    });

    it('cererea de cazare apare la Managerul de cazări ca „Neprelucrat”', async () => {
      const res = await api('get', '/api/accommodations', 'cazari');
      const request_ = res.body.find((a) => a.visit.id === visit.id);
      expect(request_).toMatchObject({ status: 'NEPRELUCRAT', apartmentType: 'DOUA_DORMITOARE' });
    });

    it('transferul dus-întors apare în calendarul șoferului ca două evenimente', async () => {
      const from = new Date(arrival.getTime() - DAY_MS).toISOString();
      const to = new Date(departure.getTime() + DAY_MS).toISOString();
      const res = await api('get', `/api/transfers?from=${from}&to=${to}`, 'sofer1');
      expect(res.status).toBe(200);
      const events = res.body.filter((e) => e.visitId === visit.id);
      expect(events).toEqual([
        expect.objectContaining({ kind: 'SOSIRE', at: arrival.toISOString(), names: ['Test Flux', 'Însoțitor Flux'] }),
        expect.objectContaining({ kind: 'PLECARE', at: departure.toISOString() }),
      ]);
    });

    it('șoferul nu are notificări', async () => {
      const res = await api('get', '/api/notifications', 'sofer1');
      expect(res.body.items.some((n) => n.visitId === visit.id)).toBe(false);
    });

    describe('Back office: Început -> Finalizat', () => {
      const setStatus = (status) =>
        api('patch', `/api/visits/${visit.id}/back-office-status`, 'backoffice').send({ status });

      it('nu se poate finaliza un caz nepreluat', async () => {
        expect((await setStatus('FINALIZAT')).status).toBe(409);
      });

      it('„Început” -> INCEPUT, cu ora începerii', async () => {
        const res = await setStatus('INCEPUT');
        expect(res.status).toBe(200);
        expect(res.body.backOfficeStatus).toBe('INCEPUT');
        expect(res.body.backOfficeStartedAt).toEqual(expect.any(String));
      });

      it('a doua apăsare pe „Început” -> 409', async () => {
        expect((await setStatus('INCEPUT')).status).toBe(409);
      });

      it('„Finalizat” -> FINALIZAT, cu ora finalizării', async () => {
        const res = await setStatus('FINALIZAT');
        expect(res.status).toBe(200);
        expect(res.body.backOfficeStatus).toBe('FINALIZAT');
        expect(res.body.backOfficeFinishedAt).toEqual(expect.any(String));
      });

      it('Contabilul nu poate schimba statusul', async () => {
        const res = await api('patch', `/api/visits/${visit.id}/back-office-status`, 'contabil').send({
          status: 'INCEPUT',
        });
        expect(res.status).toBe(403);
      });
    });

    describe('Manager cazări: Neprelucrat -> Rezervat', () => {
      const reserve = (account = 'cazari') =>
        api('patch', `/api/accommodations/${visit.accommodation.id}/status`, account).send({
          status: 'REZERVAT',
        });

      it('Back office nu poate marca rezervarea', async () => {
        expect((await reserve('backoffice')).status).toBe(403);
      });

      it('„Rezervat” -> REZERVAT, cu ora rezervării', async () => {
        const res = await reserve();
        expect(res.status).toBe(200);
        expect(res.body).toMatchObject({ status: 'REZERVAT', reservedAt: expect.any(String) });
      });

      it('a doua oară -> 409', async () => {
        expect((await reserve()).status).toBe(409);
      });
    });

    describe('notificări: fiecare doar pe ale lui', () => {
      let notificationId;

      beforeAll(async () => {
        const res = await api('get', '/api/notifications', 'backoffice');
        notificationId = res.body.items.find((n) => n.visitId === visit.id).id;
      });

      it('alt utilizator nu poate marca notificarea -> 404', async () => {
        const res = await api('patch', `/api/notifications/${notificationId}/read`, 'cazari');
        expect(res.status).toBe(404);
        const row = await prisma.notification.findUnique({ where: { id: notificationId } });
        expect(row.readAt).toBeNull();
      });

      it('proprietarul o marchează citită', async () => {
        const res = await api('patch', `/api/notifications/${notificationId}/read`, 'backoffice');
        expect(res.status).toBe(204);
        const row = await prisma.notification.findUnique({ where: { id: notificationId } });
        expect(row.readAt).not.toBeNull();
      });

      it('„Marchează toate ca citite” lasă 0 necitite', async () => {
        const res = await api('post', '/api/notifications/read-all', 'cazari');
        expect(res.status).toBe(200);
        const after = await api('get', '/api/notifications', 'cazari');
        expect(after.body.unreadCount).toBe(0);
      });
    });
  });

  describe('variante de vizită', () => {
    it('fără cazare: Managerul de cazări NU primește notificare', async () => {
      const res = await createVisit({ accommodation: null, transfer: null, companion: null });
      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({ hasCompanion: false, accommodation: null, transfer: null });
      const roles = await notificationRoles(res.body.id);
      expect(roles.every((role) => role === 'BACK_OFFICE:VIZITA_NOUA_BACK_OFFICE')).toBe(true);
      expect(roles).toHaveLength(await activeCount('BACK_OFFICE'));
    });

    it('însoțitor fără tratament: nu are rând de tratament', async () => {
      const res = await createVisit({ companion: { firstName: 'Fără', lastName: 'Tratament' } });
      expect(res.status).toBe(201);
      expect(res.body.patients[1]).toMatchObject({ isCompanion: true, treatment: null, availability: null });
    });

    it('Managerul de cazări vede detaliile doar pentru vizitele cu cazare (tratamentul e dată medicală)', async () => {
      const withAccommodation = await createVisit({});
      const withoutAccommodation = await createVisit({ accommodation: null });

      const allowed = await api('get', `/api/visits/${withAccommodation.body.id}`, 'cazari');
      expect(allowed.status).toBe(200);
      expect(allowed.body.patients[0].treatment).toBe('Implant (test automat)');

      const hidden = await api('get', `/api/visits/${withoutAccommodation.body.id}`, 'cazari');
      expect(hidden.status).toBe(404);
      expect(hidden.body).toEqual({ error: 'Vizita nu există' });

      // celelalte roluri văd în continuare vizita fără cazare
      expect((await api('get', `/api/visits/${withoutAccommodation.body.id}`, 'backoffice')).status).toBe(200);
      expect((await api('get', `/api/visits/${withoutAccommodation.body.id}`, 'contabil')).status).toBe(200);
    });

    it('Admin poate înregistra o vizită', async () => {
      expect((await createVisit({}, 'admin')).status).toBe(201);
    });

    it('doi utilizatori Back office apasă „Început” simultan: doar unul reușește', async () => {
      const res = await createVisit({ accommodation: null, transfer: null });
      const path = `/api/visits/${res.body.id}/back-office-status`;
      const results = await Promise.all([
        api('patch', path, 'backoffice').send({ status: 'INCEPUT' }),
        api('patch', path, 'admin').send({ status: 'INCEPUT' }),
      ]);
      expect(results.map((r) => r.status).sort()).toEqual([200, 409]);
    });
  });

  describe('cine NU poate înregistra vizite', () => {
    it.each(['backoffice', 'cazari', 'sofer1', 'contabil'])('%s -> 403', async (account) => {
      const res = await createVisit({}, account);
      expect(res.status).toBe(403);
    });

    it('coordonator ales greșit (ex. un șofer) -> 400', async () => {
      const sofer = await prisma.user.findUnique({ where: { email: 'sofer1@puntobianco.demo' } });
      const res = await createVisit({ coordinatorId: sofer.id });
      expect(res.status).toBe(400);
      expect(res.body.details).toEqual([{ field: 'coordinatorId', message: 'Coordonator invalid' }]);
    });
  });
});
