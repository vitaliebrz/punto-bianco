# Plan 06 — Test de încărcare: 50 de utilizatori în același timp

**Ziua 3** · Ramura: `test/load-testing` · Status: **finalizat**

## Context
Tema cere ca aplicația să funcționeze pentru **cel puțin 50 de utilizatori conectați în același timp**. Arhitectura a fost gândită pentru asta:
- un singur client Prisma;
- adresa Neon *pooled*, adică conexiuni reutilizate;
- login cu JWT, fără sesiuni ținute pe server.

Cerința nu a fost însă **măsurată**. Acum o verificăm cu un test automat, care rămâne în proiect și poate fi rulat oricând, inclusiv pe aplicația publicată.

**Decizii luate cu tine:**
- Testul **scrie în baza `dev`**: vizite noi și butoanele de status. Tot ce creează e **marcat și șters la final**; datele demo rămân neatinse.
- Scriptul rămâne în repo (`npm run load-test`), iar rezultatele intră în documentație.

## Ce simulează testul
**50 de utilizatori virtuali**, conectați în același timp, cu toate rolurile, ca într-o zi obișnuită la clinică:

| Rol | Utilizatori | Ce face fiecare, în buclă, cu o pauză de 1–3 s între acțiuni (ca un om) |
|---|---|---|
| Coordonator | 10 | lista vizitelor, lista coordonatorilor, **înregistrează vizite noi**, deschide detaliile |
| Back office | 10 | lista, clopoțelul, detaliile, **„Început” / „Finalizat”** pe vizitele create de test |
| Manager cazări | 8 | lista cazărilor, clopoțelul, **„Rezervat”** pe cererile create de test |
| Șofer | 8 | calendarul săptămânii (`/api/transfers`) |
| Contabil, Control calitate | 6 + 4 | listele (doar citire) |
| Admin | 4 | de toate |

- **Pornirea:** toți 50 intră în cont **în aceeași secundă**. E cel mai greu moment, pentru că bcrypt e intenționat lent.
- **Durata:** 60 de secunde de lucru continuu (se poate schimba).
- **La final**, un vârf: 50 de cereri `GET /api/visits` trimise **exact în același moment**.
- **Clopoțelul:** fiecare utilizator îl verifică periodic, ca în aplicație.
- **Butoanele de status** se apasă doar pe vizitele create de test. Dacă doi utilizatori Back office apasă pe aceeași vizită, unul primește 409, ceea ce e corect. Aceste 409 se numără separat, nu ca erori.

## Ce măsoară
- numărul total de cereri și **câte pe secundă**;
- **erorile**: orice 5xx, conexiune eșuată sau 4xx neașteptat;
- **timpii de răspuns**, pe fiecare rută: median (p50), p95, p99 și maxim;
- vizitele create și **verificarea ștergerii** la final.

**Criterii de reușită (rulare locală, cu baza Neon `dev`):**
- 0 erori;
- toate cele 50 de login-uri reușite;
- p95 sub 1 secundă pe toate rutele;
- datele de test șterse complet.

## Implementare
- **`backend/scripts/load-test.js`**, fără pachete noi (folosește `fetch` din Node 20):
  - utilizatori virtuali în paralel, fiecare cu rolul și bucla lui de acțiuni;
  - statistici pe rute: p50, p95, p99, max, erori, plus un tabel la final;
  - marcaj pe datele create: numele de familie al pacientului e `TestIncarcare`;
  - **curățenie** la final (și la Ctrl+C sau eroare): șterge prin Prisma vizitele cu acest marcaj, iar persoanele, cazarea, transferul și notificările lor se șterg în cascadă; apoi verifică faptul că nu a rămas nimic;
  - siguranță: afișează host-ul bazei. **Scrierile sunt pornite doar dacă `LOAD_WRITES=1`**, iar `npm run load-test` le pornește doar pentru serverul local; refuză să scrie dacă `NODE_ENV=production`. _(Mai strict din [planul 07](07-code-review-reparatii.md): scrierile sunt permise **doar** pe API-ul local și doar dacă baza din `.env` e cea din `DB_WRITE_HOST`.)_
- **`backend/package.json`:** `"load-test": "node scripts/load-test.js"`.
- **Parametri** (variabile de mediu):
  - `LOAD_BASE_URL` (implicit `http://localhost:3000`);
  - `LOAD_USERS` (implicit 50);
  - `LOAD_DURATION` (secunde, implicit 60);
  - `LOAD_WRITES` (implicit 1 local).
- **Fără schimbări** în codul aplicației, doar dacă testul găsește o problemă reală. În cazul ăsta o notez aici, la abateri.

## Pași și commit-uri (le faci tu)
| # | Ce fac eu | Commit propus |
|---|---|---|
| 1 | acest plan + cuprinsul `docs/README.md` | `docs: add plan 06 (load test)` |
| 2 | scriptul + `npm run load-test` | `test(backend): add load test for 50 concurrent users` |
| 3 | **rulez testul** (scrie în baza `dev`, cu acordul tău deja dat) + rezultatele în plan, `docs/arhitectura.md` și `docs/README.md` | `docs: add load test results` |

La final: PR **`test: load test for 50 concurrent users`**.

## Limitări
- Rularea locală măsoară serverul de pe calculatorul tău și baza Neon din Frankfurt. După publicare, testul se rulează din nou pe Render, cu `LOAD_BASE_URL` = adresa Render și **fără scrieri**. Planul de tip gratuit de pe Render are un procesor mult mai slab, deci timpii vor fi alții.

## Ce s-a implementat / abateri de la plan

### Rezultat final (rulare locală, 27.10.2026)
Backend pe calculatorul de dezvoltare, baza Neon `dev` (Frankfurt), 50 de utilizatori, 60 s, cu scrieri:

| Rută | cereri | erori | 409 (corect) | p50 | p95 | p99 |
|---|---|---|---|---|---|---|
| `POST /api/auth/login` (50 în aceeași secundă) | 50 | 0 | | 1878 ms | 2757 ms | 2780 ms |
| `GET /api/visits` | 372 | 0 | | 182 ms | 309 ms | 375 ms |
| `GET /api/visits/:id` | 200 | 0 | | 148 ms | 205 ms | 252 ms |
| `GET /api/accommodations` | 188 | 0 | | 161 ms | 245 ms | 274 ms |
| `GET /api/transfers` (calendarul) | 274 | 0 | | 149 ms | 204 ms | 239 ms |
| `GET /api/notifications` (clopoțelul) | 100 | 0 | | 221 ms | 582 ms | 587 ms |
| `POST /api/visits` (vizită nouă) | 76 | 0 | | 901 ms | 1377 ms | 1581 ms |
| `PATCH …/back-office-status` | 79 | 0 | 9 | 382 ms | 494 ms | 527 ms |
| `PATCH …/accommodations/:id/status` | 52 | 0 | 5 | 382 ms | 487 ms | 497 ms |
| vârf: 50 de cereri în același moment (pagina principală a fiecăruia) | 50 | 0 | | 432–543 ms | 754 ms | 814 ms |

**Total:** 1.519 cereri în 62,5 s (**24 de cereri pe secundă**), **0 erori**. Toate cele 76 de vizite de test au fost șterse. Răspunsurile 409 sunt corecte: doi colegi au apăsat același buton în același timp și doar primul a reușit.

**Cerința „50 de utilizatori simultan” e îndeplinită.**

### Probleme găsite de test și reparate
| # | Problemă | Cauză | Reparație | Înainte → după |
|---|---|---|---|---|
| 1 | **40 din 50 de login-uri simultane respinse (429)** | limita de 10 încercări eșuate era **pe IP**; login-urile reușite sunt scăzute din contor abia după ce se termină, deci 50 de login-uri simultane depășeau limita. Toată clinica are același IP. | două limite: **10 eșuate pe cont** (email + IP) și **100 pe IP** (`routes/auth.js`); 3 teste noi în `api.test.js` | 10/50 → **50/50** |
| 2 | Listele și detaliile lente | Prisma citea o vizită din ~6 interogări una după alta, fiecare cu ~60 ms până la Frankfurt | `previewFeatures = ["relationJoins"]` în `schema.prisma`: o singură interogare cu JOIN (fără migrare, rezultate identice, verificat) | lista vizitelor: 446 → **72 ms** (o interogare); sub încărcare p95 945 → **309 ms** |

### Abateri de la plan
| Plan | Ce s-a făcut | De ce |
|---|---|---|
| Fără schimbări în aplicație | 2 schimbări (vezi mai sus) | testul a găsit două probleme reale |
| Criteriu: p95 sub 1 s pe **toate** rutele | p95 sub 1 s pentru **citiri**, sub 2 s pentru **scrieri**; login: toate cele 50 reușite | timpul login-ului e dat de bcrypt, intenționat lent (~70 ms/parolă; 50 simultan, câte 4 în paralel ≈ 1 s), și se întâmplă o dată la 8 ore. Scrierile fac ~15 interogări într-o tranzacție, fiecare cu ~60 ms de acasă până la Frankfurt; pe Render, în aceeași regiune cu baza, drumul e de 1–2 ms. Citirile sunt ce face omul tot timpul |
| Vârful: toți cer `/api/visits` | fiecare cere pagina lui principală (șoferul calendarul, managerul cazările) | șoferul și managerul de cazări nu au acces la lista vizitelor (403, corect), deci vârful trebuie să urmeze ce fac ei în aplicație |
| — | `frontend/vite.config.js`: `optimizeDeps.entries` | în timpul testării, serverul de dezvoltare Vite a refăcut pachetele bibliotecilor la mijlocul sesiunii, iar browserul a rămas cu două versiuni de React (ecran alb, „504 Outdated Optimize Dep”). Acum Vite analizează toate fișierele la pornire. Afectează doar dezvoltarea, nu aplicația publicată |

### Cum se rulează
```powershell
cd backend
npm run dev          # într-un terminal: API-ul
npm run load-test    # în altul: 50 de utilizatori, 60 s (scrie în baza dev și curăță la final)
```
Pentru aplicația publicată (doar citiri), în PowerShell:
```powershell
$env:LOAD_BASE_URL = "https://…"; $env:LOAD_WRITES = "0"; npm run load-test
```
