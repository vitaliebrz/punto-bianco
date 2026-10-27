// Verificarea variabilelor de mediu la pornire: o valoare greșită oprește serverul cu un mesaj clar,
// în loc să pornească cu o setare stricată (ex. limita de login fără IP-ul real al utilizatorilor).

// Valoarea din .env.example: nu e secretă, deci nu are voie în producție
const EXAMPLE_JWT_SECRET = 'schimba-ma-cu-un-sir-lung-si-aleator';
const MIN_JWT_SECRET_LENGTH = 32;
const MAX_TRUST_PROXY = 10;

// TRUST_PROXY = câte proxy-uri stau în fața aplicației (pe Render: 1).
// Lipsă / gol -> undefined (nu credem X-Forwarded-For). Altceva decât un număr întreg 0–10 -> eroare:
// Number('true') ar fi NaN, iar Express ar folosi IP-ul proxy-ului pentru toți utilizatorii.
export function parseTrustProxy(value) {
  const text = value?.trim();
  if (!text) return undefined;
  if (!/^\d+$/.test(text) || Number(text) > MAX_TRUST_PROXY) {
    throw new Error(`TRUST_PROXY invalid ("${text}"): trebuie să fie un număr întreg între 0 și ${MAX_TRUST_PROXY} (pe Render: 1)`);
  }
  return Number(text);
}

// Ce e greșit la JWT_SECRET (sau null dacă e în regulă). În producție: minim 32 de caractere și nu valoarea de exemplu.
export function jwtSecretProblem(env = process.env) {
  const secret = env.JWT_SECRET;
  if (!secret) return 'Lipsește JWT_SECRET';
  if (env.NODE_ENV !== 'production') return null;
  if (secret === EXAMPLE_JWT_SECRET) return 'JWT_SECRET e valoarea de exemplu din .env.example; generează unul nou';
  if (secret.length < MIN_JWT_SECRET_LENGTH) {
    return `JWT_SECRET prea scurt pentru producție (minim ${MIN_JWT_SECRET_LENGTH} de caractere)`;
  }
  return null;
}
