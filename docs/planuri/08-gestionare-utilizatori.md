# Plan 08 — Gestionarea utilizatorilor (Admin)

**Ziua 3** · Ramura: `feature/user-management` · Status: **finalizat**

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

## Code review după implementare: reparații
Un review automat al ramurii a găsit 9 probleme. Le reparăm pe toate înainte de merge.

| # | Problema | Reparația | Test |
|---|---|---|---|
| 1 | **Aplicația poate rămâne fără Admin:** un Admin poate dezactiva alți Admini; doi Admini care se dezactivează unul pe altul în același timp reușesc amândoi | dezactivarea se face într-o tranzacție `Serializable`: după schimbare trebuie să rămână cel puțin un Admin activ, altfel 400; două dezactivări simultane care ar lăsa 0 Admini → una e oprită de bază (409, „reîncarcă lista”) | `users-api` (bază simulată) |
| 2 | Reîncărcarea listei după un cont nou poate suprascrie o dezactivare mai nouă | fără reîncărcare: contul nou (din răspunsul POST) se adaugă direct în listă | `users.test` |
| 3 | Rândul dezactivat rămâne printre conturile active | lista e ordonată mereu în pagină, ca pe server: întâi activii, apoi după nume | `users.test` |
| 4 | bcrypt rulează și pentru un email deja folosit | întâi căutarea emailului (409 fără criptare); tratarea erorii de unicitate rămâne pentru cererile simultane | `users-api` |
| 5 | `console.error` rămâne ascuns după un test | mock-urile se restabilesc după fiecare test (`afterEach`) | — |
| 6 | `FormField` cu `action` pe un `select` își pierde săgeata | `action` se aplică doar câmpurilor text | — |
| 7 | „Butonul în dreapta câmpului” e scris de două ori (login și `FormField`) | o singură componentă, `WithAction`, folosită de amândouă | testele existente |
| 8 | Butonul cu ochi are și etichetă schimbătoare, și starea „apăsat” (semnale contradictorii) | rămâne doar eticheta schimbătoare („Arată parola” / „Ascunde parola”) | `auth.test` |
| 9 | Mesajul „Nu există utilizatori” nu poate apărea (lista conține mereu Admin-ul conectat) | ramura și importul se șterg | — |

## Ce s-a implementat / abateri de la plan

### Rezultat
- **Backend:** `GET`, `POST /api/users` și `PATCH /api/users/:id/active`, doar pentru Admin.
  - Parola se salvează doar ca hash bcrypt.
  - Un email deja folosit primește 409, cu eroarea la câmpul Email (regula ține și la două cereri simultane).
  - Admin-ul nu se poate dezactiva pe sine și rămâne mereu cel puțin un Admin activ (după code review, vezi mai sus).
  - Regulile pentru email și parolă sunt comune cu login-ul (`schemas/auth.js`).
- **Frontend:** pagina **Utilizatori** (`/utilizatori`), doar pentru Admin:
  - lista conturilor, cu insigna Activ / Inactiv și „(tu)” la contul propriu;
  - formularul de cont nou, cu „Arată parola”;
  - dezactivarea, cu confirmare, și reactivarea.
- **Teste:**

  | | înainte | după |
  |---|---|---|
  | backend | 285 | **354** |
  | frontend | 92 | **100** |

  Testul `db-users` a rulat pe Neon `dev`, cu acordul dat; după rulare n-a rămas niciun cont de test. Lint-ul (fără avertismente) și build-ul sunt curate.
- **Baza de date:** nicio schimbare, nicio migrare.

### Abateri
| Plan | Ce s-a făcut | De ce |
|---|---|---|
| — | `tests/users-api.test.js`: rutele noi prin HTTP, cu baza simulată (hash, 409, 400, 404, 500) | altfel reacțiile rutelor ar fi verificate doar de testul pe baza reală, care nu rulează în CI |
| `GET /api/users/coordinators` neschimbat | neschimbat; matricea de acces verifică acum că e deschis tuturor rolurilor | formularul de vizită are nevoie de el |
| componenta `PasswordField` | `PasswordToggle` (doar butonul cu ochi) + `action` în `FormField` | pagina de login are câmp cu iconiță, formularul folosește `FormField`; comun le e doar butonul |
| — | insigna Activ / Inactiv prin `StatusBadge` (`USER_STATUS_LABELS` în `labels.js`) | aceeași insignă ca la statusurile vizitelor |
| — | lista are eticheta „Lista utilizatorilor” | o găsesc cititoarele de ecran (și testele: numele Admin-ului apare și în bara laterală) |
| — | fără focus automat pe primul câmp greșit (cum are „Vizită nouă”) | formularul are 4 câmpuri, toate pe ecran; eroarea se vede lângă câmp |
