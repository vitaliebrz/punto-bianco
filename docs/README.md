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
  6. [Test de încărcare: 50 de utilizatori în același timp](planuri/06-test-incarcare.md)
  7. [Code review înainte de publicare: reparații](planuri/07-code-review-reparatii.md)
  8. [Gestionarea utilizatorilor (Admin)](planuri/08-gestionare-utilizatori.md)
  9. [Publicarea aplicației (Neon, Render, Vercel)](planuri/09-publicare.md)

Fiecare plan se scrie **înainte** de implementare. La final primește o secțiune „Ce s-a implementat / abateri de la plan”.

## Aplicația publicată

| | Adresa | Unde |
|---|---|---|
| **Aplicația** | https://punto-bianco.vercel.app | Vercel |
| API | https://punto-bianco.onrender.com (verificare: `/api/health`) | Render, Frankfurt, planul Free |
| Baza de date | ramura principală a proiectului Neon | Neon |

**Cum se intră:**
- conturile demo sunt cele din tabelul „Conturi demo” de mai jos;
- parola lor e cea aleasă la seed-ul de producție și **nu e în repo**: se comunică separat;
- conturi noi se creează ca Admin, din pagina **Utilizatori**.

**Planul Free de pe Render:**
- După 15 minute fără cereri, serverul „adoarme”. Prima cerere după aceea (de obicei login-ul) durează **până la ~50 de secunde**; aplicația așteaptă până la 60 s, apoi totul merge normal.
- Pentru folosire zilnică în clinică e recomandat un plan plătit (Starter): mereu pornit, procesor mai puternic.

**Publicarea automată:**
- Render și Vercel publică singure la fiecare merge în `main`.
- La fiecare publicare, Render rulează `npm run build` = `prisma generate` + `prisma migrate deploy`, deci tabelele sunt mereu la zi.

**Setările serviciilor** (variabilele, comenzile de build, ordinea publicării) sunt în [planul 09](planuri/09-publicare.md). Valorile secrete stau doar în Render, Vercel și Neon.

**Datele demo în producție** (seed-ul **șterge** tot și pune datele demo; nu se rulează după ce aplicația e folosită cu date reale):
1. Deschizi un terminal nou, în folderul `backend`, și rulezi:
   ```powershell
   $env:DATABASE_URL = "adresa pooled a producției"
   $env:DB_WRITE_HOST = "host-ul ei (partea dintre @ și /)"
   $env:SEED_PASSWORD = "parola demo"
   npm run seed
   ```
2. Închizi terminalul. Adresele producției nu ajung în `.env`.

## Pornire locală

### Cerințe
- Node.js **20.19+** sau **22.12+** (cerut de Vite 8 și Vitest 4; CI-ul folosește Node 22)
- Un proiect PostgreSQL pe [Neon](https://console.neon.tech)

### Baza de date: ramura Neon `dev`
Local se lucrează **doar** pe ramura Neon `dev`, o copie separată a bazei. Ramura principală (`production`) e folosită numai de aplicația publicată. Așa, un `npm run seed` rulat local nu poate șterge datele reale.

Adresele ramurii `dev` le iei din consola Neon: **Connect** → Branch: **`dev`**.

**Atenție la creare:** opțiunea **Auto-delete** a ramurii trebuie lăsată pe **Never**. Cu „Auto-delete after 1 day”, Neon șterge ramura a doua zi, iar backend-ul răspunde la orice cerere cu „Eroare internă” (în log: `Authentication failed against database server`). Dacă se întâmplă, creezi din nou ramura `dev` din ramura principală (datele se copiază) și actualizezi `DATABASE_URL` și `DIRECT_URL`.

### Backend
```powershell
cd backend
npm install
copy .env.example .env      # apoi completează valorile (vezi mai jos)
npx prisma generate         # generează clientul Prisma (și după fiecare schimbare a schemei; oprește întâi backend-ul)
npx prisma migrate dev      # creează/actualizează tabelele în baza de date
npm run seed                # (opțional) date demo — ȘTERGE și recreează toate datele (cere DB_WRITE_HOST)
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
| `SEED_PASSWORD` | parola comună a conturilor demo create de seed (o alegi tu) |
| `DB_WRITE_HOST` | host-ul bazei în care au voie să scrie seed-ul și testele (partea dintre `@` și `/` din `DATABASE_URL`, fără user și parolă). Dacă lipsește sau nu se potrivește, seed-ul refuză să ruleze, testul de integrare se sare, iar testul de încărcare face doar citiri |
| `TRUST_PROXY` | **doar în producție** (Render): câte proxy-uri stau în fața aplicației; local nu se setează |

Generare `JWT_SECRET`:
```powershell
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Verificare: http://localhost:3000/api/health răspunde `{"ok":true}`.

Seed-ul afișează la pornire host-ul bazei pe care scrie și pornește doar dacă e cel din `DB_WRITE_HOST` (ramura `dev`).

### Conturi demo (create de seed)
Toate au parola din `SEED_PASSWORD`. Conturi noi se creează din aplicație, ca Admin: pagina **Utilizatori**.

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

### Testare pe telefon (în aceeași rețea Wi-Fi)
1. Afli adresa calculatorului în rețea (ex. `192.168.8.116`): `ipconfig` → „IPv4 Address” la Wi-Fi.
2. Rețeaua Wi-Fi trebuie să fie **Privată** (Setări → Rețea și internet → Wi-Fi → Tip profil de rețea). Când Windows întreabă, permiți **Node.js** în rețelele private.
3. `frontend/.env.local` (ignorat de git): `VITE_API_URL=http://<adresa>:3000`.
4. `backend/.env`: `FRONTEND_URL="http://<adresa>:5173"`.
5. Pornești backend-ul (`npm run dev`) și frontend-ul cu `npm run dev -- --host`.
6. Pe telefon deschizi `http://<adresa>:5173`; pe calculator folosești tot această adresă, nu `localhost`.

După testare: `FRONTEND_URL="http://localhost:5173"` la loc și ștergi `frontend/.env.local`.

**Dacă backend-ul nu ajunge la Neon** („Can't reach database server”), deși pe alt calculator merge: unele rețele de acasă au IPv6 care nu duce până la Neon. Se rezolvă dezactivând IPv6 pe adaptorul Wi-Fi (`ncpa.cpl` → Wi-Fi → Proprietăți → debifezi „Internet Protocol Version 6”) sau repornind routerul.

### Vizualizarea datelor
```powershell
cd backend
npx prisma studio           # interfață în browser pentru tabelele din baza de date
```

## Teste automate

```powershell
cd backend
npm test            # 354 de teste: validare, roluri, API, utilizatori, notificări, calendar, integrare cu baza (Neon dev)
npm run load-test   # test de încărcare: 50 de utilizatori simultan, 60 s (cu backend-ul pornit; scrie în baza dev și curăță la final)

cd frontend
npm test            # 100 de teste: login și sesiune, formular, liste, butoane de status, utilizatori, meniu, clopoțel, cu serverul simulat
```

`npm run test:watch` rulează testele din nou la fiecare modificare de cod.

| Unde | Fișier | Ce verifică | Bază de date |
|---|---|---|---|
| backend | `tests/validation.test.js` | modelul strict al datelor de login, limita bcrypt de 72 de bytes | nu |
| backend | `tests/auth-middleware.test.js` | token (lipsă / fals / altă cheie / `alg: none` / expirat), cont dezactivat sau șters, rolul citit din bază, roluri, regula doar-citire | nu (bază simulată) |
| backend | `tests/access.test.js` | matricea rol × rută: fiecare rol pe fiecare rută protejată (403 unde nu are acces) | nu (bază simulată) |
| backend | `tests/api.test.js` | cereri HTTP: erori, limita de încercări (pe cont și pe IP, inclusiv IP fals), CORS, header-e de securitate | nu |
| backend | `tests/visit-validation.test.js` | formularul vizitei (însoțitor și tratamentul lui, sejur, câmp gol, cazare, transfer, câmpuri în plus), statusuri, intervalul calendarului | nu |
| backend | `tests/serialize-visit.test.js` | forma vizitei trimisă clientului, varianta fără date medicale (Manager cazări) | nu |
| backend | `tests/notifications.test.js` | cine primește notificare și textul ei, ora Chișinăului (vară / iarnă) | nu |
| backend | `tests/transfer-events.test.js` | evenimentele de calendar: sosire, plecare, dus-întors, interval | nu |
| backend | `tests/db-write-guard.test.js` | scrierile uneltelor doar în baza din `DB_WRITE_HOST` | nu |
| backend | `tests/db.test.js` | login pentru toate rolurile, `/me`, coordonatori, doar-citire pe date reale | **da**, doar citire |
| backend | `tests/user-validation.test.js` | formularul unui cont nou (email, rol, parola de 8–72 de bytes, câmpuri în plus), dezactivarea | nu |
| backend | `tests/users-api.test.js` | rutele de utilizatori: hash bcrypt, email duplicat (409, fără criptare), propriul cont și ultimul Admin activ (400), dezactivări simultane (409), cont inexistent (404) | nu (bază simulată) |
| backend | `tests/db-flow.test.js` | fluxul complet: vizită → notificări → Început / Finalizat → Rezervat → calendar; roluri; apăsări simultane; Manager cazări fără date medicale | **da**, scrie și **șterge** la final |
| backend | `tests/db-users.test.js` | cont nou → login → dezactivat (login și token vechi refuzate, dispare din coordonatori) → reactivat | **da**, scrie și **șterge** la final |
| frontend | `src/test/auth.test.jsx` | login, eroare, roluri, ieșire, parola vizibilă, sesiunea după refresh, mai multe tab-uri, stocare blocată, timpul limită al cererilor | nu |
| frontend | `src/test/visit-form.test.jsx` | formularul „Vizită nouă” (comutatoare, câmpuri obligatorii, date trimise, erori lângă câmpuri și focus pe primul greșit, erori de server și rețea, lista coordonatorilor), lista vizitelor | nu |
| frontend | `src/test/status-pages.test.jsx` | Back office și Cazări: butoanele pe status, rezumatul, conflict 409, fără trimitere dublă, doar-vizualizare, detalii fără date medicale | nu |
| frontend | `src/test/navigation.test.jsx` | meniul pe roluri și meniul de pe telefon, derularea la începutul paginii, clopoțelul (și răspunsurile întârziate), textul din calendar | nu |
| frontend | `src/test/format.test.js` | ora din formular citită ca ora clinicii (vară / iarnă / schimbarea orei), date imposibile | nu |
| frontend | `src/test/data-session.test.jsx` | fără date vechi la schimbarea paginii, un 401 întârziat nu închide sesiunea nouă | nu |
| frontend | `src/test/feedback.test.jsx` | eroarea la „Marchează toate ca citite”, mesajul „Vizita a fost înregistrată” o singură dată, „Înapoi” și „Reîncearcă” în detalii | nu |
| frontend | `src/test/labels.test.js` | etichetele de cost, numărarea pe statusuri | nu |
| frontend | `src/test/users.test.jsx` | pagina Utilizatori: lista, cont nou, email duplicat, dezactivare cu confirmare, doar Admin | nu |

Testele frontend pică dacă pagina face o cerere pe care testul nu a simulat-o (`src/test/setup.js`).

**Testele de integrare** (`db.test.js`, `db-flow.test.js`, `db-users.test.js`):
- au nevoie de `backend/.env` cu baza Neon `dev` și de datele din seed (`npm run seed`);
- `db-flow.test.js` și `db-users.test.js` rulează doar dacă `DB_WRITE_HOST` e host-ul din `DATABASE_URL`; șterg la pornire resturile unei rulări întrerupte, creează vizite / conturi de test (`test-utilizator-…@puntobianco.test`) și le șterg la final; datele din seed și notificările tale rămân neatinse;
- dacă lipsesc datele de acces la bază, sunt sărite automat.

**GitHub Actions** ([.github/workflows/ci.yml](../.github/workflows/ci.yml)) rulează pe Node 22 la fiecare Pull Request și la fiecare push pe `main`:
- backend: schema Prisma (`prisma validate`), teste;
- frontend: lint (avertismentele opresc CI-ul), teste, build.

Testele cu baza de date sunt sărite acolo, pentru că secretele Neon nu se pun pe GitHub.

**Notă npm:**
- Dacă `npm install` dă eroarea `edgesOut` (bug în npm 10.8), folosește `npx npm@11 install <pachet>`. `npm ci`, folosit în CI, nu are această problemă.
- npm 10 șterge din `package-lock.json` rândurile `libc` (pachetele pentru Linux, unde rulează CI și Render). Dacă după un `npm install` apare `package-lock.json` modificat fără să fi adăugat pachete, aruncă modificarea (GitHub Desktop: clic dreapta → **Discard changes…**).

## Mod de lucru cu git
- Fiecare pas logic are ramura lui (`feature/...`, `fix/...`, `test/...`), cu commit-uri mici, în stilul *conventional commits* (`feat:`, `fix:`, `refactor:`, `test:`, `ci:`, `chore:`, `docs:`).
- **Înainte de o ramură nouă:** treci pe `main` și rulezi **Fetch origin** + **Pull origin**, ca ramura să pornească de la ultima versiune.
- Unirea în `main` se face prin Pull Request, după ce bifa CI e verde.
