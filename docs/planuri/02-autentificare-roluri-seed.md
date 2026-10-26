# Plan 02 — Autentificare, roluri, seed și pagina de login

**Ziua 1, pasul 2** · Ramură: `feature/auth-and-seed` · Status: **în lucru**

## Scop
Membrii echipei se pot conecta, iar fiecare are acces doar la ce ține de rolul lui. Contabil și Control calitate au acces doar la citire. Baza se umple cu date inventate (seed), iar o pagină simplă de login arată legătura frontend → backend → Neon.

**Decizii:**
- Pagina de login se face acum (Ziua 1).
- Adminul **nu** gestionează utilizatori din aplicație; conturile vin din seed. Tema nu cere gestionarea utilizatorilor.

## Cum funcționează autentificarea
1. Utilizatorul trimite email și parolă la `POST /api/auth/login`.
2. Backend-ul caută userul și compară parola cu `passwordHash` folosind bcrypt. Parola nu se salvează niciodată în clar.
3. Dacă parola e corectă, backend-ul întoarce un **token JWT**: un „bilet” semnat cu `JWT_SECRET`, care conține id-ul și rolul userului. E valabil 8 ore.
4. Frontend-ul păstrează token-ul și îl trimite la fiecare cerere, în header-ul `Authorization: Bearer <token>`.
5. Backend-ul verifică biletul și rolul înainte de a răspunde.

## Backend

### 1. Client Prisma unic — `backend/src/lib/prisma.js`
Un singur `PrismaClient`, folosit în toată aplicația. Conexiunile se reutilizează, iar adresa pooled din Neon suportă 50+ utilizatori simultani.

### 2. Middleware de acces — `backend/src/middleware/auth.js`
- **`requireAuth`**:
  - verifică token-ul (`jwt.verify` cu `JWT_SECRET`);
  - încarcă userul din bază, ca un cont dezactivat sau un rol schimbat să aibă efect imediat;
  - pune userul în `req.user`;
  - fără token, token invalid/expirat sau user inactiv → **401**.
- **`requireRole(...roles)`**: dacă rolul nu e permis → **403**. `ADMIN` trece mereu.
- **`readOnlyGuard`**: pentru `CONTABIL` și `CONTROL_CALITATE`, orice metodă în afară de GET → **403**. Se aplică global pe rutele protejate, deci nu poate fi uitat pe o rută nouă.

### 3. Validarea strictă a datelor de intrare — `middleware/validate.js` + `schemas/auth.js`
Librăria **`zod`** descrie exact forma acceptată a datelor.

**`validate(schema)`**:
- dacă `req.body` nu respectă schema → **400**, iar cererea nu ajunge la cod sau la bază;
- dacă o respectă, `req.body` e înlocuit cu datele curățate;
- se reutilizează la toate formularele de la Ziua 2.

**`loginSchema`** acceptă exact acest model:
```js
z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(1).max(72),
}).strict()
```
- Doar câmpurile `email` și `password`. Un câmp în plus (de exemplu `role`) → 400.
- Ambele trebuie să fie text. Un obiect, o listă sau un număr → 400. Asta blochează **„operator injection”**: altfel cineva ar putea trimite `{"email": {"contains": "@"}}`, pe care Prisma l-ar putea interpreta ca filtru.
- 72 de caractere e limita bcrypt.
- Mesajul de eroare e generic: „Date de autentificare invalide”.

**`express.json({ limit: '10kb' })`:** se acceptă doar JSON, de mici dimensiuni.

### 4. Protecție anti-ghicire parolă (brute force)
**`express-rate-limit`** pe `POST /api/auth/login`:
- maxim 10 încercări **greșite** în 15 minute de pe același IP, apoi → **429**;
- `trust proxy` e activat, ca pe Render să se vadă IP-ul real al utilizatorului.

### 5. Rute de autentificare — `backend/src/routes/auth.js`
**`POST /api/auth/login`**: limitare → validare → verificare. Răspunde cu `{ token, user: { id, email, fullName, role } }`.
- Pentru email inexistent, parolă greșită sau cont inactiv, mesajul e același: „Email sau parolă greșite” (**401**).
- Când email-ul nu există, parola se compară totuși cu un hash fals, ca timpul de răspuns să nu dezvăluie dacă un cont există.
- Rolul vine **numai** din baza de date.

**`GET /api/auth/me`** întoarce userul conectat, fără `passwordHash`.

### 6. Lista de coordonatori — `backend/src/routes/users.js`
**`GET /api/users/coordinators`** întoarce `[{ id, fullName }]` pentru coordonatorii activi. Alimentează lista „coordonator responsabil” din formularul de pacient.

### 7. `backend/src/index.js`
- **CORS** restricționat la `FRONTEND_URL`: local `http://localhost:5173`, în producție adresa de pe Vercel.
- **Rute:** `/api/auth` (login public) și `/api/users` (cu `requireAuth` + `readOnlyGuard`).
- **Handler de erori:** loghează eroarea și răspunde 500 „Eroare internă”, fără detalii tehnice către client.

### 8. Variabile noi în `.env`
- `FRONTEND_URL`: adresa frontend-ului (pentru CORS).
- `SEED_PASSWORD`: parola comună a conturilor demo.

## Seed — `backend/prisma/seed.js`
**Rulare:** `npm run seed` (echivalent cu `prisma db seed`).

**Protecții:**
- Șterge datele existente și le creează din nou, deci se poate rula de mai multe ori.
- Refuză să ruleze dacă `NODE_ENV=production`.

**Utilizatori demo** (domeniu fictiv `@puntobianco.demo`, parola din `SEED_PASSWORD`):

| Email | Rol |
|---|---|
| admin@ | ADMIN |
| coordonator1@, coordonator2@ | COORDONATOR |
| backoffice@ | BACK_OFFICE |
| cazari@ | MANAGER_CAZARI |
| sofer1@, sofer2@ | SOFER |
| contabil@ | CONTABIL |
| calitate@ | CONTROL_CALITATE |

**10 vizite inventate:**
- Pacienți din Italia, Germania, Marea Britanie, Franța, Israel și SUA.
- Datele sunt relative la ziua rulării (de la −3 la +21 zile).
- Combinații variate:
  - cu sau fără însoțitor; însoțitorul are sau nu tratament;
  - toate tipurile de apartament, cazare gratuită sau contra cost, cereri rezervate sau nerezervate;
  - transfer în toate direcțiile, gratuit sau contra cost, iar unele vizite fără transfer;
  - statusuri Back office diferite.
- Notificările nu se creează în seed; le creează logica de la Ziua 2.

## Frontend
- **Pachet nou:** `react-router-dom`.
- **`frontend/.env`:** `VITE_API_URL=http://localhost:3000`.
- **`src/api.js`**, funcția `apiFetch`:
  - adaugă adresa API-ului și token-ul la fiecare cerere;
  - la 401 șterge token-ul.
- **`src/auth/AuthContext.jsx`**:
  - ține minte userul conectat;
  - `login` și `logout`;
  - la refresh păstrează sesiunea prin `/api/auth/me`.
- **`src/auth/ProtectedRoute.jsx`**: dacă nu ești conectat, te trimite la `/login`.
- **`src/roles.js`**: denumirile rolurilor în română.
- **`src/pages/LoginPage.jsx`**: formular email + parolă, cu mesaj de eroare.
- **`src/pages/HomePage.jsx`**: „Bun venit”, numele, rolul, butonul „Ieșire” și mențiunea „acces doar la citire” pentru rolurile read-only.
- **Stil minimal**, cu culorile clinicii ca variabile CSS (`--mint: #98D3C3`, `--gray: #565555`) și adaptat pentru telefon. Designul complet vine la Ziua 3.
- **Token-ul se păstrează în `localStorage`.** E simplu și potrivit pentru această temă. Varianta cu cookie httpOnly ar complica configurarea între Vercel și Render.

## Ordinea commit-urilor
| # | Conținut | Commit |
|---|---|---|
| 0 | documentația `docs/` | `docs: add project documentation and implementation plans` |
| 1 | client Prisma + middleware auth | `feat(auth): add Prisma client and JWT auth middleware` |
| 2 | validare zod | `feat(api): add strict request validation with zod` |
| 3 | login, `/me`, rate limit, CORS, erori | `feat(auth): add login and current-user endpoints with rate limiting` |
| 4 | lista coordonatori | `feat(users): add coordinators list endpoint` |
| 5 | seed | `feat(db): add seed with demo users and visits` |
| 6 | client API + context auth | `feat(frontend): add API client and auth context` |
| 7 | pagini login + home | `feat(frontend): add login page and protected home page` |

## Verificare
1. **Seed:** după `npm run seed`, Prisma Studio arată 10 utilizatori și 10 vizite complete.
2. **API:**
   - login corect → token;
   - `/me` cu token → userul; fără token → 401;
   - parolă greșită → 401 cu mesaj generic;
   - lista de coordonatori → 2.
3. **Validare** (fiecare caz → 400):
   - câmp în plus;
   - email trimis ca obiect;
   - parolă trimisă ca număr;
   - email invalid;
   - corp gol;
   - corp care nu e JSON.
4. **Rate limit:** a 11-a încercare greșită → 429.
5. **Roluri** (test temporar, necomis):
   - SOFER pe o rută de coordonator → 403;
   - CONTABIL cu POST → 403;
   - CONTABIL cu GET → permis;
   - ADMIN → permis.
6. **Frontend:**
   - login cu fiecare rol → numele și rolul corecte;
   - după refresh → rămâi conectat;
   - „Ieșire” → înapoi la login;
   - parolă greșită → mesaj de eroare;
   - pe lățime de telefon → arată bine;
   - `npm run build` trece.

## Ce s-a implementat / abateri de la plan
_Se completează la final._
