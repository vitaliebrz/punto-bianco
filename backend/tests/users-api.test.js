// Rutele de gestionare a utilizatorilor, prin aplicația reală (HTTP), cu baza de date simulată:
// rulează și în CI. Fluxul pe baza reală e în db-users.test.js.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { Prisma } from '@prisma/client';
import { createApp } from '../src/app.js';

const ADMIN = { id: 1, email: 'admin@puntobianco.demo', fullName: 'Elena Popescu', role: 'ADMIN', active: true };

// takenEmails: emailurile deja folosite; transaction: opțiunile ultimei tranzacții (nivelul de izolare)
const db = vi.hoisted(() => ({ create: null, update: null, count: null, takenEmails: [], transaction: null }));
vi.mock('../src/lib/prisma.js', () => {
  const user = {
    findUnique: async ({ where }) => {
      if (where.id === 1) return ADMIN;
      if (where.email) return db.takenEmails.includes(where.email) ? { id: 99 } : null;
      return null;
    },
    create: (args) => db.create(args),
    update: (args) => db.update(args),
    count: (args) => db.count(args),
  };
  return {
    default: {
      user,
      $transaction: async (work, options) => {
        db.transaction = options;
        return work({ user });
      },
    },
  };
});

const prismaError = (code) => new Prisma.PrismaClientKnownRequestError('eroare simulată', { code, clientVersion: 'test' });
const adminToken = jwt.sign({ role: 'ADMIN' }, process.env.JWT_SECRET, { subject: '1' });
const asAdmin = (req) => req.set('Authorization', `Bearer ${adminToken}`);

const NEW_USER = { fullName: 'Maria Lungu', email: 'Maria.Lungu@puntobianco.demo', role: 'BACK_OFFICE', password: 'Parola123' };

let app;
beforeEach(() => {
  app = createApp();
  db.create = vi.fn(async ({ data }) => ({ id: 20, email: data.email, fullName: data.fullName, role: data.role, active: true }));
  db.update = vi.fn(async ({ where, data }) => ({ ...ADMIN, id: where.id, role: 'SOFER', ...data }));
  db.count = vi.fn(async () => 1);
  db.takenEmails = [];
  db.transaction = null;
});

// Spionii (ex. console.error ascuns într-un test) nu rămân activi în testele următoare
afterEach(() => {
  vi.restoreAllMocks();
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

  it('email deja folosit -> 409 la câmpul email, fără criptarea parolei (bcrypt e lent)', async () => {
    db.takenEmails = ['maria.lungu@puntobianco.demo'];
    const hash = vi.spyOn(bcrypt, 'hash');
    const res = await asAdmin(request(app).post('/api/users')).send(NEW_USER);

    expect(res.status).toBe(409);
    expect(res.body.details).toEqual([{ field: 'email', message: 'Există deja un cont cu acest email' }]);
    expect(hash).not.toHaveBeenCalled();
    expect(db.create).not.toHaveBeenCalled();
  });

  it('două cereri simultane cu același email: a doua e oprită de unicitatea din bază -> 409', async () => {
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

  it('alt Admin poate fi dezactivat cât timp rămâne cel puțin un Admin activ', async () => {
    db.update.mockImplementation(async ({ where, data }) => ({ ...ADMIN, id: where.id, ...data }));
    db.count.mockResolvedValue(1);
    const res = await asAdmin(request(app).patch('/api/users/7/active')).send({ active: false });

    expect(res.status).toBe(200);
    expect(db.count).toHaveBeenCalledWith({ where: { role: 'ADMIN', active: true } });
    // izolarea care oprește două dezactivări simultane (Admini care se dezactivează unul pe altul)
    expect(db.transaction).toEqual({ isolationLevel: 'Serializable' });
  });

  it('ultimul Admin activ nu poate fi dezactivat -> 400 (schimbarea e anulată)', async () => {
    db.update.mockImplementation(async ({ where, data }) => ({ ...ADMIN, id: where.id, ...data }));
    db.count.mockResolvedValue(0);
    const res = await asAdmin(request(app).patch('/api/users/7/active')).send({ active: false });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'Trebuie să rămână cel puțin un Admin activ' });
  });

  it('dezactivarea unui cont care nu e Admin nu numără Adminii', async () => {
    await asAdmin(request(app).patch('/api/users/6/active')).send({ active: false });
    expect(db.count).not.toHaveBeenCalled();
  });

  it('două dezactivări simultane oprite de bază (P2034) -> 409, „reîncarcă lista”', async () => {
    db.update.mockRejectedValue(prismaError('P2034'));
    const res = await asAdmin(request(app).patch('/api/users/7/active')).send({ active: false });

    expect(res.status).toBe(409);
    expect(res.body.error).toContain('Reîncarcă lista');
  });

  it('utilizator inexistent -> 404; id invalid -> 400', async () => {
    db.update.mockRejectedValue(prismaError('P2025'));
    expect((await asAdmin(request(app).patch('/api/users/999/active')).send({ active: true })).status).toBe(404);
    expect((await asAdmin(request(app).patch('/api/users/abc/active')).send({ active: true })).status).toBe(400);
  });
});
