# Plan 09 — Publicarea aplicației (Neon + Render + Vercel)

**Ziua 3** · Ramura: `chore/deployment` · Status: **în lucru**

## Context
Aplicația e completă și testată local, inclusiv cu 50 de utilizatori simultan. Acum trebuie publicată pe internet, ca echipa clinicii să o deschidă de pe calculator sau telefon. Nu adăugăm funcții noi, schimbăm doar ce cere publicarea.

| Parte | Unde | Plan |
|---|---|---|
| Baza de date | **Neon**, ramura principală (producție) | gratuit; separată de ramura `dev` |
| Backend (API) | **Render**, regiunea Frankfurt (lângă baza Neon) | **Free** |
| Frontend | **Vercel** | gratuit |

**Ce înseamnă planul Free pe Render:**
- Serverul „adoarme” după 15 minute fără cereri. Prima cerere după aceea durează **~50 de secunde**, apoi totul merge normal.
- Procesorul e slab, așa că login-urile simultane sunt mai lente decât local.
- Testul cu 50 de utilizatori arată pe Render limita planului gratuit. Codul a fost deja verificat local: 0 erori ([planul 06](06-test-incarcare.md)).

## Ce schimbăm în cod

### Backend
1. **`TRUST_PROXY` verificat strict.**
   - Acceptă doar un număr întreg de proxy-uri (0–10).
   - O valoare greșită (ex. `true`, `1a`) **oprește pornirea**, cu un mesaj clar. Altfel `Number('true')` = `NaN` și limita de încercări la login ar vedea IP-ul serverului Render în locul IP-ului fiecărui utilizator.
2. **`JWT_SECRET` în producție** (`NODE_ENV=production`): minim 32 de caractere. Unul lipsă sau scurt oprește pornirea.
3. **Oprire curată:** la `SIGTERM` (Render îl trimite la fiecare republicare), serverul nu mai primește cereri noi, le termină pe cele în curs și închide conexiunea la bază.
4. **Build pe Render:**
   - `prisma` trece din `devDependencies` în `dependencies`. Cu `NODE_ENV=production`, Render nu instalează pachetele de dezvoltare, iar comanda `prisma` ar lipsi.
   - Scriptul nou `npm run build` = `prisma generate && prisma migrate deploy`: tabelele se creează sau se actualizează la fiecare publicare.
5. **Node fixat:** `backend/.node-version` = `22`, aceeași versiune ca în CI.

### Frontend
6. **`frontend/vercel.json`:** orice adresă (ex. `/vizite/12`) e servită de `index.html`. Altfel, un refresh sau un link direct dă „404 Not Found” pe Vercel.
7. **Timpul limită al cererilor: 20 s → 60 s.** Pe planul Free, prima cerere după „somn” durează ~50 s și ar fi oprită cu „Serverul nu răspunde”.

Fiecare schimbare vine cu testul ei.

## Variabilele de mediu
Valorile secrete le generezi și le pui **tu**, direct în Render, Vercel și Neon. Nu le trimiți în chat.

**Render (backend):**

| Variabilă | Valoare |
|---|---|
| `DATABASE_URL` | Neon, ramura principală, adresa **pooled** (`-pooler`) |
| `DIRECT_URL` | Neon, ramura principală, adresa **directă** |
| `JWT_SECRET` | nou, generat cu `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |
| `NODE_ENV` | `production` |
| `TRUST_PROXY` | `1` |
| `FRONTEND_URL` | adresa de pe Vercel (ex. `https://punto-bianco.vercel.app`) |

**Vercel (frontend):** `VITE_API_URL` = adresa de pe Render (ex. `https://punto-bianco-api.onrender.com`).

## Setările serviciilor
- **Render → New → Web Service:**
  - **Repo:** `punto-bianco`; **Branch:** `main`; **Root Directory:** `backend`; **Region:** Frankfurt.
  - **Build Command:** `npm ci && npm run build`; **Start Command:** `npm start`.
  - **Health Check Path:** `/api/health`; **Instance Type:** Free.
- **Vercel → Add New → Project:**
  - **Repo:** `punto-bianco`; **Root Directory:** `frontend`.
  - **Framework:** Vite (build `npm run build`, output `dist`).
- **Publicare automată:** ambele publică singure la fiecare merge în `main`.

## Ordinea publicării (o faci tu, cu instrucțiunile mele)
1. **Neon:** adresele ramurii principale (Connect → Branch: principală): pooled și directă.
2. **Render:** serviciul, cu variabilele de mai sus. `FRONTEND_URL` e temporar `http://localhost:5173`. La build se creează tabelele în baza de producție. Verifici: `https://…onrender.com/api/health` → `{"ok":true}`.
3. **Vercel:** proiectul, cu `VITE_API_URL` = adresa Render. Primești adresa aplicației.
4. **Render:** `FRONTEND_URL` = adresa Vercel → serviciul se republică singur.
5. **Datele demo în producție** (o singură dată, cu acordul tău):
   - Seed-ul se rulează de pe calculatorul tău, cu adresele producției puse **doar în terminalul curent**, nu în `.env`.
   - `DB_WRITE_HOST` = host-ul producției, ca protecția să-l lase să scrie.
   - Pui o **parolă demo nouă**, alta decât cea de pe `dev`.
   - Închizi terminalul după aceea.

## Verificare
1. Pe adresa Vercel: login cu fiecare rol, pe calculator și pe telefon.
   - Coordonatorul înregistrează o vizită: Back office și Manager cazări primesc notificarea, iar șoferul vede transferul în calendar.
   - Un refresh pe `/vizite/…` nu dă 404.
2. Admin: pagina Utilizatori funcționează.
3. **Testul cu 50 de utilizatori pe Render, doar citiri.** Scrierile sunt refuzate automat pentru un server care nu e local.
   - Rulează după ce serverul e „trezit”.
   - Rezultatele intră în acest plan.

## Pași și commit-uri (le faci tu)
| # | Conținut | Commit propus |
|---|---|---|
| 1 | acest plan + cuprinsul `docs/README.md` | `docs: add plan 09 (deployment)` |
| 2 | backend: `TRUST_PROXY`, `JWT_SECRET`, oprire curată, `prisma` + `build`, `.node-version` + teste | `chore(backend): prepare the API for production on Render` |
| 3 | frontend: `vercel.json`, timpul limită de 60 s + test | `chore(frontend): prepare the SPA for Vercel` |
| 4 | publicarea (Neon → Render → Vercel), seed în producție | — (setări în servicii, fără cod) |
| 5 | verificarea, testul de încărcare pe Render, README („Aplicația publicată”) + „Ce s-a implementat” | `docs: document the deployment` |

La final: PR **`chore: deploy to Render and Vercel`**.

## Ce s-a implementat / abateri de la plan
_Se completează la final._
