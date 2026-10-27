# Plan 08 — Gestionarea utilizatorilor (Admin)

**Ziua 3** · Ramura: `feature/user-management` · Status: **în lucru**

## Context
Acum conturile se creează doar din seed, care șterge toate datele. Admin-ul nu poate adăuga un coleg nou și nu poate opri accesul cuiva care pleacă din clinică.

Publicarea aplicației devine **planul 09**.

**Decizii:**
- Admin-ul poate:
  - să vadă lista utilizatorilor;
  - să creeze un utilizator: nume, email, rol, parolă;
  - să **dezactiveze sau să reactiveze** un cont.
- **Fără ștergere:** vizitele păstrează coordonatorul și autorul.
- Parola inițială o scrie Admin-ul (minim 8 caractere) și i-o comunică colegului.
- Fără editarea numelui sau a rolului și fără resetarea parolei.

**Baza de date nu se schimbă:** `User` are deja `email` (unic), `fullName`, `role`, `active` și `passwordHash`. Nu e nevoie de migrare.

## Ce refolosim
- **`requireAuth`** citește utilizatorul din bază la fiecare cerere. Un cont dezactivat pierde accesul **imediat**, chiar dacă token-ul lui e încă valabil. Login-ul refuză deja conturile inactive.
- **`requireRole()`** fără roluri = doar ADMIN.
- **`schemas/auth.js`:** regula pentru email (`trim`, litere mici, maxim 254) și limita bcrypt de 72 de bytes.
- **`validate()`**, cu erorile `details[{ field, message }]`, și **`parseId`**.
- **bcrypt** cu cost 10, ca în seed.
- **Frontend:**
  - componentele `FormField`, `Listbox`, `PageHeader`, `PageState`, `EmptyState`, `Button`;
  - `useApiData`;
  - modelul `busyIds` de la Back office;
  - `errorsByField`;
  - `ROLE_LABELS`;
  - butonul „Arată parola” din pagina de login.

## Backend

### `backend/src/schemas/user.js` (zod, strict)
```
createUserSchema = strict {
  fullName: text 1–100 (trim)
  email:    ca la login (trim, litere mici, email valid, max 254)
  role:     unul din cele 7 roluri (inclusiv ADMIN)
  password: min 8 caractere, max 72 bytes (limita bcrypt)
}
userActiveSchema = strict { active: true | false }
```

### Rute noi în `backend/src/routes/users.js` (doar ADMIN)
`GET /api/users/coordinators` rămâne neschimbat.

| Metodă | Rută | Ce face |
|---|---|---|
| GET | `/api/users` | `[{ id, email, fullName, role, active, createdAt }]`, întâi cei activi, apoi după nume; **niciodată** `passwordHash` |
| POST | `/api/users` | creează contul (parola se salvează doar ca hash bcrypt) → 201; email existent → **409**, cu eroarea la câmpul `email` (sigur și la două cereri simultane: e prinsă eroarea de unicitate din bază) |
| PATCH | `/api/users/:id/active` | `{ active }` → utilizatorul actualizat; id invalid → 400; inexistent → 404; **Admin-ul nu se poate dezactiva pe sine** → 400, ca aplicația să nu rămână fără Admin |

**Efectele dezactivării** (fără cod nou):
- contul nu mai poate face login;
- token-ul vechi primește 401;
- un coordonator dezactivat dispare din lista „Coordonator responsabil”;
- colegii dezactivați de la Back office sau Cazări nu mai primesc notificări;
- vizitele vechi rămân neschimbate.

## Frontend
- **Meniul:** „Utilizatori” (`/utilizatori`) apare doar pentru Admin, ultimul în listă, cu iconița `UserGear`.
- **Pagina `UsersPage`:**
  - **Antetul:** butonul „Utilizator nou” deschide formularul în pagină.
  - **Formularul:**
    - câmpuri: Nume complet, Email, Rol, Parolă inițială (cu „Arată parola”);
    - erorile apar lângă câmpuri, inclusiv emailul deja folosit;
    - butoanele sunt blocate cât se salvează;
    - după creare: „Contul a fost creat. Comunică-i colegului emailul și parola.”
  - **Lista:** carduri pe telefon, tabel pe ecran lat. Pe fiecare rând: nume, email, rol și insigna Activ / Inactiv.
    - Butonul „Dezactivează” cere confirmare: „Dezactivezi contul lui X? Nu va mai putea intra în aplicație.” Butonul „Reactivează” nu cere.
    - Fiecare rând își blochează butonul cât se salvează.
    - La contul propriu apare „(tu)”, fără buton.
- **`PasswordField`:** câmpul de parolă cu „Arată parola” din pagina de login devine o componentă comună.

## Teste
- **Backend, fără bază:**
  - `tests/user-validation.test.js`:
    - formular valid;
    - câmpuri în plus (`active`, `passwordHash`);
    - email invalid sau scris cu majuscule;
    - rol inexistent;
    - parolă scurtă sau peste 72 de bytes.
  - `tests/access.test.js`: rutele noi sunt permise doar pentru ADMIN; celelalte 6 roluri primesc 403.
- **Backend, cu baza `dev`: `tests/db-users.test.js`.**
  - Rulează doar cu `DB_WRITE_HOST` și cu acordul tău.
  - Conturile de test au email `test-utilizator-…@puntobianco.test` și se șterg la început și la final.
  - Ce verifică:
    - crearea → 201, fără hash în răspuns;
    - contul nou poate face login;
    - același email → 409;
    - după dezactivare: login 401, iar token-ul vechi primește 401;
    - un coordonator dezactivat dispare din listă;
    - după reactivare, login-ul merge din nou;
    - Admin-ul care încearcă să se dezactiveze pe sine → 400.
- **Frontend, `src/test/users.test.jsx`:**
  - lista, cu „(tu)”;
  - crearea unui cont;
  - 409 la câmpul Email;
  - dezactivarea, cu confirmare și cu anulare;
  - pagina e doar pentru Admin.

## Pași și commit-uri (le faci tu)
| # | Conținut | Commit propus |
|---|---|---|
| 1 | acest plan + cuprinsul `docs/README.md` | `docs: add plan 08 (user management)` |
| 2 | `schemas/user.js`, rutele din `routes/users.js` + teste de validare + matricea de acces | `feat(api): add admin endpoints to list, create and deactivate users` |
| 3 | `tests/db-users.test.js` (rulat după acordul tău) | `test(backend): cover user management against the database` |
| 4 | `PasswordField`, `UsersPage`, meniul, ruta + `users.test.jsx` | `feat(frontend): add users page for admins` |
| 5 | `docs/arhitectura.md`, `docs/README.md` + „Ce s-a implementat” | `docs: document user management and update plan 08` |

La final: PR **`feat: admin user management`**.

## Verificare
1. `npm test` în `backend` și `frontend`; `npm run lint -- --deny-warnings` și `npm run build` în `frontend`.
2. Manual, ca **admin**:
   1. Creezi „Test Coleg”, cu rolul Back office.
   2. Intri cu el într-o fereastră privată și vezi pagina Back office.
   3. Îl dezactivezi din contul de admin. La următoarea acțiune, fereastra lui ajunge la login, iar login-ul refuză.
   4. Îl reactivezi și merge din nou.
3. Pe telefon: lista și formularul arată bine.

## Ce s-a implementat / abateri de la plan
_Se completează la final._
