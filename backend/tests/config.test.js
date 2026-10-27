// Variabilele de mediu verificate la pornire (publicarea pe Render).
import { afterEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { jwtSecretProblem, parseTrustProxy } from '../src/config.js';

describe('parseTrustProxy', () => {
  it.each([undefined, '', '   '])('lipsă / gol (%j) -> nu se setează', (value) => {
    expect(parseTrustProxy(value)).toBeUndefined();
  });

  it.each([
    ['0', 0],
    ['1', 1],
    [' 2 ', 2],
    ['10', 10],
  ])('%j -> %i', (value, expected) => {
    expect(parseTrustProxy(value)).toBe(expected);
  });

  it.each(['true', '1a', '-1', '1.5', '11', 'loopback'])('valoare greșită %j -> eroare clară', (value) => {
    expect(() => parseTrustProxy(value)).toThrow(/TRUST_PROXY invalid/);
  });

  describe('createApp', () => {
    afterEach(() => {
      delete process.env.TRUST_PROXY;
    });

    it('nu pornește cu un TRUST_PROXY greșit (altfel limita de login ar vedea IP-ul proxy-ului)', () => {
      process.env.TRUST_PROXY = 'true';
      expect(() => createApp()).toThrow(/TRUST_PROXY invalid/);
    });

    it('TRUST_PROXY=1 -> Express crede un singur proxy', () => {
      process.env.TRUST_PROXY = '1';
      expect(createApp().get('trust proxy')).toBe(1);
    });
  });
});

describe('jwtSecretProblem', () => {
  const strong = 'a'.repeat(64);

  it('lipsește -> problemă (și local)', () => {
    expect(jwtSecretProblem({})).toBe('Lipsește JWT_SECRET');
  });

  it('local (fără NODE_ENV=production): orice valoare e acceptată', () => {
    expect(jwtSecretProblem({ JWT_SECRET: 'scurt' })).toBeNull();
  });

  it('producție: valoare lungă și aleatoare -> în regulă', () => {
    expect(jwtSecretProblem({ NODE_ENV: 'production', JWT_SECRET: strong })).toBeNull();
  });

  it('producție: prea scurt -> problemă', () => {
    expect(jwtSecretProblem({ NODE_ENV: 'production', JWT_SECRET: 'a'.repeat(31) })).toMatch(/prea scurt/);
  });

  it('producție: valoarea de exemplu din .env.example -> problemă', () => {
    expect(jwtSecretProblem({ NODE_ENV: 'production', JWT_SECRET: 'schimba-ma-cu-un-sir-lung-si-aleator' })).toMatch(
      /valoarea de exemplu/,
    );
  });
});
