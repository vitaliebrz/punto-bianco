// Siguranța scrierilor „de unelte” (seed, testul de integrare, testul de încărcare) în baza de date.
// Ele șterg sau creează date, deci rulează doar pe baza aleasă explicit în .env:
//   DB_WRITE_HOST = host-ul bazei din DATABASE_URL (ex. ep-xxxx-pooler.eu-central-1.aws.neon.tech)
// Dacă cineva pune în .env adresa altei baze (ex. producția), host-ul diferă și scrierile se refuză.
// Aplicația însăși (serverul) nu folosește această verificare.

// { allowed, host, reason }: host-ul din DATABASE_URL și dacă se potrivește cu DB_WRITE_HOST
export function dbWriteCheck(env = process.env) {
  let host = null;
  try {
    host = new URL(env.DATABASE_URL).hostname;
  } catch {
    return { allowed: false, host, reason: 'DATABASE_URL lipsește sau e invalid' };
  }
  const expected = env.DB_WRITE_HOST?.trim();
  if (!expected) {
    return { allowed: false, host, reason: 'DB_WRITE_HOST lipsește din .env' };
  }
  if (expected.toLowerCase() !== host.toLowerCase()) {
    return { allowed: false, host, reason: `DB_WRITE_HOST (${expected}) nu e host-ul din DATABASE_URL (${host})` };
  }
  return { allowed: true, host, reason: '' };
}
