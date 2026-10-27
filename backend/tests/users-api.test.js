// Rutele de gestionare a utilizatorilor, prin aplicația reală (HTTP), cu baza de date simulată:
// rulează și în CI. Fluxul pe baza reală e în db-users.test.js.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { Prisma } from '@prisma/client';
import { createApp } from '../src/app.js';

const ADMIN = { id: 1, email: 'admin@puntobianco.demo', fullName: 'Elena Popescu', role: 'ADMIN', active: true };

const db = vi.hoisted(() => ({ create: null, update: null }));
vi.mock('../src/lib/prisma.js', () => ({
  default: {
    user: {
      findUnique: async ({ where }) => (where.id === 1 ? ADMIN : null),
      create: (args) => db.create(args),
      update: (args) => db.update(args),
    },
  },
}));

const prismaError = (code) => new Prisma.PrismaClientKnownRequestError('eroare simulată', { code, clientVersion: 'test' });
const adminToken = jwt.sign({ role: 'ADMIN' }, process.env.JWT_SECRET, { subject: '1' });
const asAdmin = (req) => req.set('Authorization', `Bearer ${adminToken}`);

const NEW_USER = { fullName: 'Maria Lungu', email: 'Maria.Lungu@puntobianco.demo', role: 'BACK_OFFICE', password: 'Parola123' };

let app;
beforeEach(() => {
  app = createApp();
  db.create = vi.fn(async ({ data }) => ({ id: 20, email: data.email, fullName: data.fullName, role: data.role, active: true }));
  db.update = vi.fn(async ({ where, data }) => ({ ...ADMIN, id: where.id, role: 'SOFER', ...data }));
});

describe('POST /api/users', () => {
  it('creează contul: parola salvată doar ca hash bcrypt, emailul cu litere mici', async () => {
    const res = await asAdmin(request(app).post('/api/users')).send(NEW_USER);

    expect(res.status).toBe(201);
    expect(res.body).not.toHaveProperty('passwordHash');
    const { data, select } = db.create.mock.calls[0][0];
    expect(data.email).toBe('maria.lungu@puntobianco.demo');
    expect(data).not.toHaveProperty('password');
    expect(await bcrypt.compare('Parola123', data.passwordHash)).toBe(true);
    // răspunsul nu poate conține hash-ul: el nu e printre câmpurile citite
    expect(select).not.toHaveProperty('passwordHash');
  });

  it('email deja folosit -> 409, cu eroarea la câmpul email', async () => {
    db.create.mockRejectedValue(prismaError('P2002'));
    const res = await asAdmin(request(app).post('/api/users')).send(NEW_USER);

    expect(res.status).toBe(409);
    expect(res.body.details).toEqual([{ field: 'email', message: 'Există deja un cont cu acest email' }]);
  });

  it('date invalide -> 400, fără să se creeze nimic', async () => {
    const res = await asAdmin(request(app).post('/api/users')).send({ ...NEW_USER, password: 'scurt' });

    expect(res.status).toBe(400);
    expect(res.body.details).toEqual([{ field: 'password', message: 'Cel puțin 8 caractere' }]);
    expect(db.create).not.toHaveBeenCalled();
  });

  it('altă eroare a bazei -> 500 (nu e ascunsă ca „email folosit”)', async () => {
    db.create.mockRejectedValue(new Error('conexiune pierdută'));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect((await asAdmin(request(app).post('/api/users')).send(NEW_USER)).status).toBe(500);
  });
});

describe('PATCH /api/users/:id/active', () => {
  it('dezactivează alt cont', async () => {
    const res = await asAdmin(request(app).patch('/api/users/6/active')).send({ active: false });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: 6, active: false });
    expect(db.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 6 }, data: { active: false } }));
  });

  it('Admin-ul nu se poate dezactiva pe sine -> 400', async () => {
    const res = await asAdmin(request(app).patch('/api/users/1/active')).send({ active: false });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'Nu îți poți dezactiva propriul cont' });
    expect(db.update).not.toHaveBeenCalled();
  });

  it('utilizator inexistent -> 404; id invalid -> 400', async () => {
    db.update.mockRejectedValue(prismaError('P2025'));
    expect((await asAdmin(request(app).patch('/api/users/999/active')).send({ active: true })).status).toBe(404);
    expect((await asAdmin(request(app).patch('/api/users/abc/active')).send({ active: true })).status).toBe(400);
  });
});
