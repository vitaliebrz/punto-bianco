import { describe, expect, it } from 'vitest';
import { loginSchema } from '../src/schemas/auth.js';
import { validate } from '../src/middleware/validate.js';

const valid = { email: 'admin@puntobianco.demo', password: 'Demo1234!' };

describe('loginSchema', () => {
  it('acceptă un login corect', () => {
    expect(loginSchema.safeParse(valid).success).toBe(true);
  });

  it('normalizează email-ul (spații, majuscule)', () => {
    const result = loginSchema.parse({ email: '  Admin@PuntoBianco.DEMO ', password: 'x' });
    expect(result.email).toBe('admin@puntobianco.demo');
  });

  it('acceptă parole cu diacritice', () => {
    expect(loginSchema.safeParse({ ...valid, password: 'Parolă-Sigură1!' }).success).toBe(true);
  });

  it.each([
    ['câmp în plus (role)', { ...valid, role: 'ADMIN' }],
    ['email ca obiect (operator injection)', { email: { contains: '@' }, password: 'x' }],
    ['parolă ca număr', { email: valid.email, password: 12345 }],
    ['parolă ca listă', { email: valid.email, password: ['a'] }],
    ['email invalid', { email: 'nu-e-email', password: 'x' }],
    ['email prea lung', { email: `${'a'.repeat(250)}@b.co`, password: 'x' }],
    ['parolă goală', { email: valid.email, password: '' }],
    ['parolă lipsă', { email: valid.email }],
    ['obiect gol', {}],
    ['corp lipsă (nu e JSON)', undefined],
    ['corp text', 'email=a@b.co&password=x'],
    ['null', null],
  ])('respinge: %s', (_name, body) => {
    expect(loginSchema.safeParse(body).success).toBe(false);
  });

  describe('limita bcrypt de 72 de bytes', () => {
    it('acceptă exact 72 de bytes', () => {
      expect(loginSchema.safeParse({ ...valid, password: 'a'.repeat(72) }).success).toBe(true);
      expect(loginSchema.safeParse({ ...valid, password: 'ă'.repeat(36) }).success).toBe(true);
    });

    it('respinge 73 de bytes, chiar dacă sunt sub 72 de caractere', () => {
      expect(loginSchema.safeParse({ ...valid, password: 'a'.repeat(73) }).success).toBe(false);
      // 37 de caractere, dar 73 de bytes (ă = 2 bytes)
      expect(loginSchema.safeParse({ ...valid, password: 'ă'.repeat(36) + 'X' }).success).toBe(false);
    });
  });
});

describe('middleware validate()', () => {
  function run(middleware, body) {
    const req = { body };
    const res = {
      statusCode: 200,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(data) {
        this.body = data;
        return this;
      },
    };
    let nextCalled = false;
    middleware(req, res, () => {
      nextCalled = true;
    });
    return { req, res, nextCalled };
  }

  it('date corecte: merge mai departe și păstrează doar câmpurile curățate', () => {
    const { req, nextCalled } = run(validate(loginSchema), { email: ' A@B.co ', password: 'x' });
    expect(nextCalled).toBe(true);
    expect(req.body).toEqual({ email: 'a@b.co', password: 'x' });
  });

  it('date greșite, fără mesaj generic: 400 cu detalii pe câmpuri', () => {
    const { res, nextCalled } = run(validate(loginSchema), { email: 'x', password: 'x' });
    expect(nextCalled).toBe(false);
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('Date invalide');
    expect(res.body.details[0].field).toBe('email');
  });

  it('date greșite, cu mesaj generic (login): 400 fără detalii', () => {
    const { res } = run(validate(loginSchema, { message: 'Date de autentificare invalide' }), {});
    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({ error: 'Date de autentificare invalide' });
  });
});
