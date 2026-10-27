// Formularul Admin-ului pentru un cont nou și dezactivarea / reactivarea.
import { describe, expect, it } from 'vitest';
import { createUserSchema, userActiveSchema } from '../src/schemas/user.js';

const valid = {
  fullName: 'Maria Lungu',
  email: 'maria.lungu@puntobianco.demo',
  role: 'BACK_OFFICE',
  password: 'Parola123',
};

// Câmpurile cu erori, ca „cale”: ['email', 'password']
function errorsOf(body) {
  const result = createUserSchema.safeParse(body);
  expect(result.success).toBe(false);
  return result.error.issues.map((issue) => issue.path.join('.'));
}

describe('createUserSchema', () => {
  it('acceptă un cont complet', () => {
    expect(createUserSchema.parse(valid)).toEqual(valid);
  });

  it('curăță: spații la capete; emailul cu litere mici (așa se compară la login)', () => {
    const result = createUserSchema.parse({ ...valid, fullName: '  Maria Lungu ', email: ' Maria.Lungu@PuntoBianco.demo ' });
    expect(result.fullName).toBe('Maria Lungu');
    expect(result.email).toBe('maria.lungu@puntobianco.demo');
  });

  it.each(['ADMIN', 'COORDONATOR', 'BACK_OFFICE', 'MANAGER_CAZARI', 'SOFER', 'CONTABIL', 'CONTROL_CALITATE'])(
    'acceptă rolul %s',
    (role) => {
      expect(createUserSchema.parse({ ...valid, role }).role).toBe(role);
    },
  );

  it.each([
    ['active', { active: false }],
    ['passwordHash', { passwordHash: 'x' }],
    ['id', { id: 1 }],
  ])('respinge câmpul în plus %s', (_name, extra) => {
    expect(createUserSchema.safeParse({ ...valid, ...extra }).success).toBe(false);
  });

  it('câmpuri obligatorii lipsă sau goale', () => {
    expect(errorsOf({})).toEqual(['fullName', 'email', 'role', 'password']);
    expect(errorsOf({ ...valid, fullName: '   ' })).toEqual(['fullName']);
  });

  it.each([['fără @', 'maria'], ['fără domeniu', 'maria@'], ['număr', 42]])('respinge emailul %s', (_name, email) => {
    expect(errorsOf({ ...valid, email })).toEqual(['email']);
  });

  it('respinge un rol inexistent', () => {
    const result = createUserSchema.safeParse({ ...valid, role: 'SUPERADMIN' });
    expect(result.error.issues).toEqual([expect.objectContaining({ path: ['role'], message: 'Alege rolul' })]);
  });

  it('parola: minim 8 caractere și cel mult 72 de bytes (limita bcrypt)', () => {
    expect(createUserSchema.safeParse({ ...valid, password: '1234567' }).error.issues[0].message).toBe(
      'Cel puțin 8 caractere',
    );
    expect(createUserSchema.safeParse({ ...valid, password: '12345678' }).success).toBe(true);
    // 36 de „ș” = 72 de bytes: acceptat; 37 = 74 de bytes: respins
    expect(createUserSchema.safeParse({ ...valid, password: 'ș'.repeat(36) }).success).toBe(true);
    expect(errorsOf({ ...valid, password: 'ș'.repeat(37) })).toEqual(['password']);
  });

  it('numele: cel mult 100 de caractere', () => {
    expect(errorsOf({ ...valid, fullName: 'a'.repeat(101) })).toEqual(['fullName']);
  });
});

describe('userActiveSchema', () => {
  it('acceptă doar { active: true | false }', () => {
    expect(userActiveSchema.parse({ active: false })).toEqual({ active: false });
    expect(userActiveSchema.safeParse({ active: 'false' }).success).toBe(false);
    expect(userActiveSchema.safeParse({}).success).toBe(false);
    expect(userActiveSchema.safeParse({ active: true, role: 'ADMIN' }).success).toBe(false);
  });
});
