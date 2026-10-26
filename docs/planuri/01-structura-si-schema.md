# Plan 01 — Structura proiectului și schema bazei de date

**Ziua 1, pasul 1** · Ramură: `feature/initial-setup` (PR #1, unit în `main`) + migrarea pe `feature/auth-and-seed` · Status: **finalizat**

## Scop
Scheletul monorepo-ului (`/backend` și `/frontend`) și schema completă a bazei de date pentru fluxul aplicației: pacienți, însoțitori, tratamente, cazări, transferuri, utilizatori, roluri.

## Ce s-a planificat
1. Verificarea repo-ului existent: conținea doar `README.md` și un `.gitignore` standard pentru Node.
2. `.gitignore`: completat cu fișiere de sistem și editor (`.DS_Store`, `Thumbs.db`, `.vscode/`). `node_modules` și `.env` erau deja excluse.
3. `backend/`: Node + Express + Prisma.
   - endpoint `GET /api/health`;
   - `.env.example` cu `DATABASE_URL`, `DIRECT_URL`, `JWT_SECRET`, `PORT`.
4. `backend/prisma/schema.prisma`: modelul de date (vezi [arhitectura](../arhitectura.md#modelul-de-date)).
5. `frontend/`: React + Vite, generat cu `npm create vite@latest`.
6. Migrarea nu se rulează până nu discutăm schema.

## Decizii
- **Prisma 6, nu 7:** Prisma 7 cere fișier de configurare separat și „driver adapters”. Pentru un proiect de început, complexitatea nu se justifică.
- **Vizita este tabelul central:** sosirea, plecarea, cazarea și transferul țin de sejur, nu de persoană. Pacientul și însoțitorul sunt amândoi rânduri în `Patient` (diferă prin `isCompanion`).
- **Cazarea și transferul sunt opționale:** lipsa rândului înseamnă „nu e nevoie”, deci nu mai trebuie un câmp separat „are nevoie de transfer”.
- **Transferul într-o singură direcție** se împarte în `SOSIRE` și `PLECARE`: șoferul trebuie să știe care drum îl face.
- **Datele și orele se salvează în UTC;** afișarea se face în ora locală.
- **`Visit.externalId`** există pentru legătura viitoare cu Bitrix24.

## Notă Neon
Neon oferă două adrese de conectare:
- **pooled** (host-ul conține `-pooler`), în `DATABASE_URL`: o folosește aplicația și suportă multe conexiuni simultane;
- **directă** (fără `-pooler`), în `DIRECT_URL`: o folosește doar `prisma migrate`, care nu poate lucra prin pooler.

Ambele se iau din consola Neon, butonul **Connect**, prin comutatorul *Connection pooling*.

## Ce s-a implementat / abateri de la plan
- Toate punctele de mai sus, în 4 commit-uri, unite în `main` prin PR #1.
- Verificat:
  - `prisma validate` → schema e validă;
  - `GET /api/health` → `{"ok":true}`;
  - `npm run build` în frontend → reușit.
- **Abatere:** `npm install` în frontend a eșuat cu eroarea `edgesOut`, un bug al npm 10.8. Instalarea s-a făcut cu `npx npm@11 install`.
- **Migrarea `init`** a fost rulată după discuție, pe ramura `feature/auth-and-seed`.
  - A creat 7 tabele și 6 enum-uri în Neon.
  - Fișierul de migrare e `backend/prisma/migrations/20261026093706_init/migration.sql`.
- **Avertisment `npm audit`** (3 „high”, în `deepmerge-ts`): vine din unealta CLI `prisma`, folosită doar local, și nu ajunge în aplicația publicată. Nu s-a aplicat „fix”-ul propus, pentru că ar fi trecut proiectul la Prisma 7.
