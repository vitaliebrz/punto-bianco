# Plan 03 — Code review, reparații și teste automate

**Ziua 1, pasul 3** · Ramuri: `feature/auth-and-seed` (reparații) → `test/automated-tests` (teste + CI) · Status: **în lucru**

## Scop
Am făcut code review pe tot codul de pe `feature/auth-and-seed`, înainte de merge. Reparăm problemele găsite, apoi adăugăm teste automate permanente care rulează cu `npm test`. Testele rulează și pe GitHub, la fiecare Pull Request (GitHub Actions).

## Rezultatul code review-ului

| # | Gravitate | Problemă | Cum am verificat |
|---|---|---|---|
| 1 | Medie | Limita de 10 încercări de login se poate ocoli: `trust proxy` e mereu activ, deci serverul crede IP-ul trimis de client în `X-Forwarded-For`. | 20 de încercări cu IP fals diferit → 0 blocate |
| 2 | Medie | Aceeași bază Neon pentru dezvoltare și producție: un `npm run seed` local ar șterge datele reale după publicare. | analiză |
| 3 | Mică | bcrypt folosește doar primii 72 de **bytes**, dar schema limita 72 de **caractere**. Cu diacritice, partea de după 72 de bytes e ignorată. | parolă greșită acceptată la 73 de bytes |
| 4 | Mică | Frontend: dacă serverul nu răspunde la refresh, token-ul valid e șters și utilizatorul e deconectat. | analiza codului |
| 5 | Mică | CORS: `FRONTEND_URL` scris cu `/` la final blochează toate cererile din browser. | analiză |
| 6 | Info | Lipsesc header-ele HTTP de securitate standard. | — |
| 7 | Info | `docs/planuri/02` nu mai reflectă codul (fișierele auth împărțite, 9 utilizatori, comanda de seed). | — |

## Partea A — Reparații (pe `feature/auth-and-seed`, înainte de PR)

1. **Rate limit:** `trust proxy` se activează doar dacă există variabila `TRUST_PROXY`, cu numărul de proxy-uri din fața aplicației.
   - Local nu e setată, deci IP-ul real e cel al conexiunii.
   - Pe Render setăm valoarea la publicare și o verificăm atunci.
2. **Neon `dev`:** creezi în consola Neon o ramură de bază de date `dev`, copie a celei principale.
   - `.env`-ul local folosește adresele ramurii `dev`.
   - Ramura principală (`production`) rămâne doar pentru Render.
   - Seed-ul afișează la pornire host-ul pe care scrie.
3. **bcrypt:** în `loginSchema`, parola e limitată la 72 de **bytes** (`Buffer.byteLength`), nu la 72 de caractere.
4. **Sesiune în frontend:** token-ul se șterge **doar la 401**. Dacă serverul nu răspunde, apare „Serverul nu răspunde” cu un buton „Reîncearcă”, iar sesiunea rămâne.
5. **CORS:** `FRONTEND_URL` e normalizat (fără `/` la final).
6. **helmet:** `app.use(helmet())` adaugă header-ele de securitate standard.
7. **Documentație:** `docs/planuri/02` primește secțiunea „Ce s-a implementat / abateri”. `docs/README.md` e completat cu seed, `frontend/.env` și ramura Neon `dev`.

## Partea B — Teste automate (ramură nouă `test/automated-tests`, după merge-ul PR #2)

### Backend — Vitest + Supertest
- **Refactor:** `src/app.js` exportă `createApp()` (aplicația, fără pornire), iar `src/index.js` doar o pornește.
  - Fiecare test primește o aplicație nouă, cu limita de încercări de la zero.
  - Limita se creează în `createAuthRouter()`.
- **`tests/validation.test.js`** (fără bază):
  - cazurile valide și normalizarea email-ului;
  - câmpuri în plus, tipuri greșite, email invalid, parolă goală, peste 72 de bytes, corp gol sau care nu e JSON.
- **`tests/auth-middleware.test.js`** (fără bază):
  - `requireAuth`: fără token, cu schemă greșită, cu token fals sau semnat cu altă cheie ori alt algoritm (`none`);
  - `requireRole` și `readOnlyGuard`, pentru fiecare rol.
- **`tests/api.test.js`** (HTTP, fără bază):
  - health, 404, JSON invalid → 400, corp prea mare → 413, `/me` fără token → 401;
  - **rate limit → 429**, care nu se poate ocoli cu `X-Forwarded-For`;
  - CORS (doar `FRONTEND_URL`) și header-ele helmet.
- **`tests/db.test.js`** (integrare, cu baza `dev` și datele din seed; sărit automat dacă lipsește `DATABASE_URL`):
  - login pentru toate cele 9 roluri;
  - parolă greșită → 401 generic; email cu majuscule;
  - `passwordHash` nu apare niciodată în răspunsuri;
  - `/me`, lista de coordonatori;
  - Contabil cu POST → 403.
  - Testele doar citesc din bază.
- **Script:** `npm test`.

### Frontend — Vitest + Testing Library + jsdom
- **`src/__tests__/auth.test.jsx`** (cu `fetch` simulat, fără server):
  - neconectat → ajunge pe `/login`;
  - parolă greșită → mesaj de eroare;
  - login reușit → numele și rolul în română;
  - rol read-only → mențiunea „doar vizualizare”;
  - Ieșire → înapoi la login, token șters;
  - token salvat + server căzut → mesaj „Serverul nu răspunde”, token păstrat (reparația #4);
  - token expirat (401) → token șters, înapoi la login.
- **Script:** `npm test`.

### CI — `.github/workflows/ci.yml`
La fiecare Pull Request și la push pe `main`, rulează două joburi:
- **backend:**
  - `npm ci`;
  - `prisma generate`;
  - `npm test`; testele de bază de date sunt sărite, pentru că secretele Neon nu se pun pe GitHub.
- **frontend:**
  - `npm ci`;
  - `npm run lint`;
  - `npm test`;
  - `npm run build`.

În PR apare o bifă verde sau roșie.

## Commit-uri (le face utilizatorul)
**Pe `feature/auth-and-seed`:**
1. `docs: add plan 03 (code review and automated tests)`
2. `fix(auth): prevent rate limit bypass via spoofed X-Forwarded-For`
3. `fix(auth): limit login password to 72 bytes for bcrypt`
4. `fix(api): normalize FRONTEND_URL and add security headers with helmet`
5. `fix(frontend): keep session when server is unreachable on reload`
6. `docs: update plan 02 and setup guide`

Apoi push, PR #2 și merge.

**Pe `test/automated-tests`:**
7. `refactor(backend): split app creation from server start`
8. `test(backend): add unit, API and integration tests`
9. `test(frontend): add auth flow tests`
10. `ci: run lint, tests and build on pull requests`
11. `docs: document how to run tests`

Apoi push, PR #3 (cu bifa CI) și merge.

## Verificare
- Toate testele trec local: `npm test` în `backend` și în `frontend`.
- Testul pentru IP fals trece după reparația #1. **Înainte de reparație ar fi picat** (demonstrat în review).
- `.env` local arată spre ramura Neon `dev`, iar seed-ul confirmă host-ul.
- În PR #3 bifa GitHub Actions e verde.

## Ce s-a implementat / abateri de la plan
_Se completează la final._
