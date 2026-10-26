import { describe, expect, it } from 'vitest';
import jwt from 'jsonwebtoken';
import { requireAuth, requireRole, readOnlyGuard } from '../src/middleware/auth.js';

// Execută un middleware cu un req fals; întoarce statusul sau 'next'
function run(middleware, req) {
  return new Promise((resolve) => {
    const res = {
      statusCode: 200,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(body) {
        resolve({ status: this.statusCode, body });
      },
    };
    Promise.resolve(middleware(req, res, () => resolve({ status: 'next' })));
  });
}

const bearer = (token) => ({ headers: { authorization: `Bearer ${token}` } });

describe('requireAuth (cazuri care nu ajung la baza de date)', () => {
  it('fără header Authorization -> 401', async () => {
    expect((await run(requireAuth, { headers: {} })).status).toBe(401);
  });

  it('altă schemă decât Bearer -> 401', async () => {
    expect((await run(requireAuth, { headers: { authorization: 'Basic abc' } })).status).toBe(401);
  });

  it('token stricat -> 401', async () => {
    expect((await run(requireAuth, bearer('abc.def.ghi'))).status).toBe(401);
  });

  it('token semnat cu altă cheie -> 401', async () => {
    const token = jwt.sign({ role: 'ADMIN' }, 'alta-cheie', { subject: '1' });
    expect((await run(requireAuth, bearer(token))).status).toBe(401);
  });

  it('token fără semnătură (alg "none") -> 401', async () => {
    const encode = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64url');
    const token = `${encode({ alg: 'none', typ: 'JWT' })}.${encode({ sub: '1', role: 'ADMIN' })}.`;
    expect((await run(requireAuth, bearer(token))).status).toBe(401);
  });

  it('token expirat -> 401', async () => {
    const token = jwt.sign(
      { role: 'ADMIN', exp: Math.floor(Date.now() / 1000) - 60 },
      process.env.JWT_SECRET,
      { subject: '1' },
    );
    expect((await run(requireAuth, bearer(token))).status).toBe(401);
  });

  it('token valid dar cu id invalid -> 401', async () => {
    const token = jwt.sign({ role: 'ADMIN' }, process.env.JWT_SECRET, { subject: 'abc' });
    expect((await run(requireAuth, bearer(token))).status).toBe(401);
  });
});

describe('requireRole', () => {
  const coordonatorOnly = requireRole('COORDONATOR');

  it('rolul permis -> trece', async () => {
    expect((await run(coordonatorOnly, { user: { role: 'COORDONATOR' } })).status).toBe('next');
  });

  it('ADMIN trece mereu', async () => {
    expect((await run(coordonatorOnly, { user: { role: 'ADMIN' } })).status).toBe('next');
  });

  it.each(['BACK_OFFICE', 'MANAGER_CAZARI', 'SOFER', 'CONTABIL', 'CONTROL_CALITATE'])(
    '%s pe o rută de coordonator -> 403',
    async (role) => {
      expect((await run(coordonatorOnly, { user: { role } })).status).toBe(403);
    },
  );

  it('acceptă mai multe roluri', async () => {
    const mw = requireRole('BACK_OFFICE', 'MANAGER_CAZARI');
    expect((await run(mw, { user: { role: 'MANAGER_CAZARI' } })).status).toBe('next');
    expect((await run(mw, { user: { role: 'SOFER' } })).status).toBe(403);
  });
});

describe('readOnlyGuard', () => {
  const writeMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];
  const readMethods = ['GET', 'HEAD', 'OPTIONS'];

  describe.each(['CONTABIL', 'CONTROL_CALITATE'])('%s (doar citire)', (role) => {
    it.each(writeMethods)('%s -> 403', async (method) => {
      const result = await run(readOnlyGuard, { method, user: { role } });
      expect(result.status).toBe(403);
      expect(result.body.error).toBe('Rolul tău are acces doar la citire');
    });

    it.each(readMethods)('%s -> trece', async (method) => {
      expect((await run(readOnlyGuard, { method, user: { role } })).status).toBe('next');
    });
  });

  describe.each(['ADMIN', 'COORDONATOR', 'BACK_OFFICE', 'MANAGER_CAZARI', 'SOFER'])(
    '%s (poate modifica)',
    (role) => {
      it.each(writeMethods)('%s -> trece', async (method) => {
        expect((await run(readOnlyGuard, { method, user: { role } })).status).toBe('next');
      });
    },
  );
});
