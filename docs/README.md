# Documentație Punto Bianco

Aplicație web pentru clinica stomatologică Punto Bianco: organizarea vizitei fiecărui pacient (tratament, transfer de la aeroport, cazare), cu acces pe roluri.

## Cuprins
- [Arhitectura](arhitectura.md): tehnologii, structura repo-ului, modelul de date
- Planuri de implementare (în ordinea în care au fost făcute):
  1. [Structura proiectului și schema bazei de date](planuri/01-structura-si-schema.md)
  2. [Autentificare, roluri, seed și pagina de login](planuri/02-autentificare-roluri-seed.md)
  3. [Code review, reparații și teste automate](planuri/03-code-review-si-teste.md)

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

## Mod de lucru cu git
- Fiecare pas logic are ramura lui (`feature/...`), cu commit-uri mici, în stilul *conventional commits* (`feat:`, `fix:`, `chore:`, `docs:`).
- Unirea în `main` se face prin Pull Request.
