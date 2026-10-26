# Documentație Punto Bianco

Aplicație web pentru clinica stomatologică Punto Bianco: organizarea vizitei fiecărui pacient (tratament, transfer de la aeroport, cazare), cu acces pe roluri.

## Cuprins
- [Arhitectura](arhitectura.md): tehnologii, structura repo-ului, fluxul vizitei, rutele API, modelul de date
- Planuri de implementare (în ordinea în care au fost făcute):
  1. [Structura proiectului și schema bazei de date](planuri/01-structura-si-schema.md)
  2. [Autentificare, roluri, seed și pagina de login](planuri/02-autentificare-roluri-seed.md)
  3. [Code review, reparații și teste automate](planuri/03-code-review-si-teste.md)
  4. [Fluxul vizitei: înregistrare, notificări, ecrane pe roluri](planuri/04-fluxul-vizitei.md)
  5. [Design: brand, Tailwind, redesign complet](planuri/05-design-brand.md)

Fiecare plan se scrie **înainte** de implementare. La final primește o secțiune „Ce s-a implementat / abateri de la plan”.

## Pornire locală

### Cerințe
- Node.js 20+
- Un proiect PostgreSQL pe [Neon](https://console.neon.tech)

### Baza de date: ramura Neon `dev`
Local se lucrează **doar** pe ramura Neon `dev`, o copie separată a bazei. Ramura principală (`production`) e folosită numai de aplicația publicată. Așa, un `npm run seed` rulat local nu poate șterge datele reale.

Adresele ramurii `dev` le iei din consola Neon: **Connect** → Branch: **`dev`**.

### Backend
```powershell
cd backend
npm install
copy .env.example .env      # apoi completează valorile (vezi mai jos)
npx prisma migrate dev      # creează/actualizează tabelele în baza de date
npm run seed                # (opțional) date demo — ȘTERGE și recreează toate datele
npm run dev                 # pornește API-ul pe http://localhost:3000
```

Variabile în `backend/.env`:

| Variabilă | Ce este |
|---|---|
| `DATABASE_URL` | adresa Neon **pooled** a ramurii `dev` (host-ul conține `-pooler`), folosită de aplicație |
| `DIRECT_URL` | adresa Neon **directă** a ramurii `dev` (fără `-pooler`), folosită doar de `prisma migrate` |
| `JWT_SECRET` | șir lung, aleator, pentru semnarea token-urilor de login |
| `PORT` | portul API-ului (implicit 3000) |
| `FRONTEND_URL` | adresa frontend-ului care are voie să cheme API-ul (CORS); local `http://localhost:5173` |
| `SEED_PASSWORD` | parola comună a conturilor demo create de seed |
| `TRUST_PROXY` | **doar în producție** (Render): câte proxy-uri stau în fața aplicației; local nu se setează |

Generare `JWT_SECRET`:
```powershell
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Verificare: http://localhost:3000/api/health răspunde `{"ok":true}`.

Seed-ul afișează la pornire host-ul bazei pe care scrie. Verifică să fie cel al ramurii `dev`.

### Conturi demo (create de seed)
Toate au parola din `SEED_PASSWORD`.

| Email | Rol |
|---|---|
| `admin@puntobianco.demo` | Admin |
| `coordonator1@puntobianco.demo`, `coordonator2@puntobianco.demo` | Coordonator tratament |
| `backoffice@puntobianco.demo` | Back office |
| `cazari@puntobianco.demo` | Manager cazări |
| `sofer1@puntobianco.demo`, `sofer2@puntobianco.demo` | Șofer |
| `contabil@puntobianco.demo` | Contabil (doar citire) |
| `calitate@puntobianco.demo` | Control calitate (doar citire) |

### Frontend
```powershell
cd frontend
npm install                 # dacă apare eroarea "edgesOut", folosește: npx npm@11 install
npm run dev                 # pornește pe http://localhost:5173
```

Opțional, în `frontend/.env` (vezi `frontend/.env.example`): `VITE_API_URL`, adresa backend-ului. Dacă lipsește, se folosește `http://localhost:3000`.

### Vizualizarea datelor
```powershell
cd backend
npx prisma studio           # interfață în browser pentru tabelele din baza de date
```

## Teste automate

```powershell
cd backend
npm test            # 213 teste: validare, roluri, API, notificări, calendar, integrare cu baza (Neon dev)

cd frontend
npm test            # 39 de teste: login, formular, liste, butoane de status, meniu, clopoțel, cu serverul simulat
```

`npm run test:watch` rulează testele din nou la fiecare modificare de cod.

| Unde | Fișier | Ce verifică | Bază de date |
|---|---|---|---|
| backend | `tests/validation.test.js` | modelul strict al datelor de login, limita bcrypt de 72 de bytes | nu |
| backend | `tests/auth-middleware.test.js` | token (lipsă / fals / altă cheie / `alg: none` / expirat), roluri, regula doar-citire | nu |
| backend | `tests/api.test.js` | cereri HTTP: erori, limita de încercări (inclusiv IP fals), CORS, header-e de securitate | nu |
| backend | `tests/visit-validation.test.js` | formularul vizitei (însoțitor, sejur, cazare, transfer, câmpuri în plus), statusuri, intervalul calendarului | nu |
| backend | `tests/notifications.test.js` | cine primește notificare și textul ei, ora Chișinăului (vară / iarnă) | nu |
| backend | `tests/transfer-events.test.js` | evenimentele de calendar: sosire, plecare, dus-întors, interval | nu |
| backend | `tests/db.test.js` | login pentru toate rolurile, `/me`, coordonatori, doar-citire pe date reale | **da**, doar citire |
| backend | `tests/db-flow.test.js` | fluxul complet: vizită → notificări → Început / Finalizat → Rezervat → calendar; roluri; apăsări simultane | **da**, scrie și **șterge** la final |
| frontend | `src/test/auth.test.jsx` | login, eroare, roluri, ieșire, sesiunea după refresh (token valid / expirat / server oprit) | nu |
| frontend | `src/test/visit-form.test.jsx` | formularul „Vizită nouă” (bife, date trimise, erori lângă câmpuri), lista vizitelor | nu |
| frontend | `src/test/status-pages.test.jsx` | Back office și Cazări: butoanele pe status, conflict 409, doar-vizualizare | nu |
| frontend | `src/test/navigation.test.jsx` | meniul și prima pagină pe roluri, clopoțelul, textul din calendar | nu |

**Testele de integrare** (`db.test.js`, `db-flow.test.js`):
- au nevoie de `backend/.env` cu baza Neon `dev` și de datele din seed (`npm run seed`);
- `db-flow.test.js` creează vizite de test și le șterge la final; datele din seed rămân neatinse;
- dacă `DATABASE_URL` sau `SEED_PASSWORD` lipsesc, sunt sărite automat.

**GitHub Actions** ([.github/workflows/ci.yml](../.github/workflows/ci.yml)) rulează la fiecare Pull Request și la fiecare push pe `main`:
- backend: teste;
- frontend: lint, teste, build.

Testele cu baza de date sunt sărite acolo, pentru că secretele Neon nu se pun pe GitHub.

**Notă npm:**
- Dacă `npm install` dă eroarea `edgesOut` (bug în npm 10.8), folosește `npx npm@11 install <pachet>`. `npm ci`, folosit în CI, nu are această problemă.
- npm 10 șterge din `package-lock.json` rândurile `libc` (pachetele pentru Linux, unde rulează CI și Render). Dacă după un `npm install` apare `package-lock.json` modificat fără să fi adăugat pachete, aruncă modificarea (GitHub Desktop: clic dreapta → **Discard changes…**).

## Mod de lucru cu git
- Fiecare pas logic are ramura lui (`feature/...`, `fix/...`, `test/...`), cu commit-uri mici, în stilul *conventional commits* (`feat:`, `fix:`, `refactor:`, `test:`, `ci:`, `chore:`, `docs:`).
- **Înainte de o ramură nouă:** treci pe `main` și rulezi **Fetch origin** + **Pull origin**, ca ramura să pornească de la ultima versiune.
- Unirea în `main` se face prin Pull Request, după ce bifa CI e verde.
