# Documentație Punto Bianco

Aplicație web pentru clinica stomatologică Punto Bianco: organizarea vizitei fiecărui pacient (tratament, transfer de la aeroport, cazare), cu acces pe roluri.

## Cuprins
- [Arhitectura](arhitectura.md): tehnologii, structura repo-ului, modelul de date
- Planuri de implementare (în ordinea în care au fost făcute):
  1. [Structura proiectului și schema bazei de date](planuri/01-structura-si-schema.md)
  2. [Autentificare, roluri, seed și pagina de login](planuri/02-autentificare-roluri-seed.md)

Fiecare plan se scrie **înainte** de implementare. La final primește o secțiune „Ce s-a implementat / abateri de la plan”.

## Pornire locală

### Cerințe
- Node.js 20+
- Un proiect PostgreSQL pe [Neon](https://console.neon.tech)

### Backend
```powershell
cd backend
npm install
copy .env.example .env      # apoi completează valorile (vezi mai jos)
npx prisma migrate dev      # creează/actualizează tabelele în baza de date
npm run dev                 # pornește API-ul pe http://localhost:3000
```

Variabile în `backend/.env`:

| Variabilă | Ce este |
|---|---|
| `DATABASE_URL` | adresa Neon **pooled** (host-ul conține `-pooler`), folosită de aplicație |
| `DIRECT_URL` | adresa Neon **directă** (fără `-pooler`), folosită doar de `prisma migrate` |
| `JWT_SECRET` | șir lung, aleator, pentru semnarea token-urilor de login |
| `PORT` | portul API-ului (implicit 3000) |

Generare `JWT_SECRET`:
```powershell
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Verificare: http://localhost:3000/api/health răspunde `{"ok":true}`.

### Frontend
```powershell
cd frontend
npm install                 # dacă apare eroarea "edgesOut", folosește: npx npm@11 install
npm run dev                 # pornește pe http://localhost:5173
```

### Vizualizarea datelor
```powershell
cd backend
npx prisma studio           # interfață în browser pentru tabelele din baza de date
```

## Mod de lucru cu git
- Fiecare pas logic are ramura lui (`feature/...`), cu commit-uri mici, în stilul *conventional commits* (`feat:`, `fix:`, `chore:`, `docs:`).
- Unirea în `main` se face prin Pull Request.
