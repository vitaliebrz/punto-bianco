// Seed-ul, testul de integrare și testul de încărcare scriu doar în baza aleasă explicit (DB_WRITE_HOST).
import { describe, expect, it } from 'vitest';
import { dbWriteCheck } from '../src/lib/dbWriteGuard.js';

const DEV = 'postgresql://user:parola@ep-dev-123-pooler.eu-central-1.aws.neon.tech/neondb?sslmode=require';
const PROD = 'postgresql://user:parola@ep-prod-456-pooler.eu-central-1.aws.neon.tech/neondb?sslmode=require';

describe('dbWriteCheck', () => {
  it('host-ul din DATABASE_URL e cel din DB_WRITE_HOST -> permis', () => {
    expect(dbWriteCheck({ DATABASE_URL: DEV, DB_WRITE_HOST: 'ep-dev-123-pooler.eu-central-1.aws.neon.tech' })).toEqual({
      allowed: true,
      host: 'ep-dev-123-pooler.eu-central-1.aws.neon.tech',
      reason: '',
    });
  });

  it('nu contează majusculele și spațiile', () => {
    expect(dbWriteCheck({ DATABASE_URL: DEV, DB_WRITE_HOST: ' EP-DEV-123-pooler.eu-central-1.aws.neon.tech ' }).allowed).toBe(true);
  });

  it('DATABASE_URL arată spre altă bază (ex. producția) -> refuzat', () => {
    const result = dbWriteCheck({ DATABASE_URL: PROD, DB_WRITE_HOST: 'ep-dev-123-pooler.eu-central-1.aws.neon.tech' });
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('ep-prod-456-pooler');
  });

  it('DB_WRITE_HOST lipsă -> refuzat', () => {
    expect(dbWriteCheck({ DATABASE_URL: DEV })).toMatchObject({ allowed: false, reason: 'DB_WRITE_HOST lipsește din .env' });
  });

  it('DATABASE_URL lipsă sau stricat -> refuzat', () => {
    expect(dbWriteCheck({ DB_WRITE_HOST: 'x' }).allowed).toBe(false);
    expect(dbWriteCheck({ DATABASE_URL: 'nu-e-adresa', DB_WRITE_HOST: 'x' }).allowed).toBe(false);
  });

  it('parola din adresă nu apare în rezultat', () => {
    expect(JSON.stringify(dbWriteCheck({ DATABASE_URL: PROD, DB_WRITE_HOST: 'altceva' }))).not.toContain('parola');
  });
});
