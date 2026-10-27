# Plan 04 — Ziua 2: fluxul vizitei (înregistrare → notificări → ecrane pe roluri)

**Ziua 2** · Ramura: `feature/visit-registration-flow` · Status: **finalizat**

## Context
Ziua 1 e în `main` (PR #1–#3): schemă, login, roluri, seed, teste, CI. Acum construim Pașii 1 și 2 din cerință:
- **Pasul 1:** coordonatorul înregistrează pacientul.
- **Pasul 2:** aplicația anunță automat echipa:
  - Back office: notificare + lista sortată după sosire + butoanele „Început” / „Finalizat”;
  - Manager cazări: notificare + lista cu „Neprelucrat” → „Rezervat”;
  - Șofer: calendar în stil Google Calendar.
- „Fiecare utilizator vede doar ce ține de rolul lui”; Contabil și Control calitate doar văd.

**Decizii luate cu tine:**
- Calendarul se face cu **FullCalendar** (licență MIT).
- Notificările apar ca un **clopoțel în aplicație**, verificat la ~30 de secunde (fără email).
- **Șoferul nu primește notificări**, doar vede calendarul (exact ca în cerință).
- Vizita **nu se editează și nu se șterge** (doar creare și vizualizare; fără funcții în plus).

**Presupuneri:**
- Orele se afișează în fusul orar al clinicii, **Europe/Chisinau**. Coordonatorul introduce ora locală.
- Design-ul final (logo, MULLER) rămâne pentru Ziua 3. Acum folosim doar stilul existent (mentă/gri).

**Baza de date nu se schimbă:** schema din Ziua 1 acoperă deja toate câmpurile, deci nu e nevoie de migrare. Valoarea `TRANSFER_NOU` din enum rămâne nefolosită, deoarece șoferul nu primește notificări.

**Regula git rămâne:** eu nu fac commit/push/PR. După fiecare pas îți dau mesajul de commit și fișierele de bifat.

---

## Cine ce vede (backend-ul impune regulile; frontend-ul doar ascunde)

| Rol | Pagini | Poate modifica |
|---|---|---|
| Admin | toate | tot |
| Coordonator | Vizite, Vizită nouă, Detalii vizită | creează vizite |
| Back office | Back office (+ detalii vizită) | Început / Finalizat |
| Manager cazări | Cazări (+ detalii vizită) | Rezervat |
| Șofer | Calendar transferuri | nimic |
| Contabil, Control calitate | Vizite, Back office, Cazări, Calendar | nimic (fără butoane; serverul dă 403 oricum) |

Clopoțelul de notificări apare doar pentru **Back office** și **Manager cazări**, singurii care primesc notificări.

---

## Backend

### 1. Validarea formularului — `backend/src/schemas/visit.js` (zod, strict, ca `loginSchema`)
```
person      = { firstName, lastName (1–100, trim), availability? (≤1000; text gol → null) }
createVisit = strict {
  patient:       person + treatment (1–2000, obligatoriu)
  companion:     null | person + treatment? (dacă există → însoțitorul are tratament)
  arrivalAt, departureAt: dată ISO cu fus orar → Date; plecarea după sosire
  coordinatorId: întreg pozitiv
  accommodation: null | { apartmentType (enum), isFree, freeDays }
                 isFree = true → freeDays 1–365 obligatoriu; false → freeDays lipsește
  transfer:      null | { isFree, direction: SOSIRE | PLECARE | DUS_INTORS }
}
```
- Câmpuri în plus (de exemplu `createdById`, `backOfficeStatus`, `externalId`) → 400, ca la login.
- `null` la cazare sau transfer înseamnă „nu e nevoie”, la fel ca regula din model.
- Tot aici:
  - `backOfficeStatusSchema = { status: INCEPUT | FINALIZAT }`;
  - `accommodationStatusSchema = { status: REZERVAT }`;
  - `transfersRangeSchema` (`from` / `to` din query, interval de maxim 62 de zile).
- Se refolosește [validate.js](../../backend/src/middleware/validate.js); id-urile din URL trec printr-un mic `parseId` → 400 dacă nu e număr.

### 2. Logică pură, testabilă fără bază — `backend/src/services/`
- **`notifications.js`**:
  - `buildVisitNotifications(visit, recipients)` → rândurile `Notification`:
    - `VIZITA_NOUA_BACK_OFFICE` pentru fiecare Back office activ: „Vizită nouă: Marco Rossi (+ însoțitor), sosire 28.10.2026 14:30”;
    - `CAZARE_NOUA` pentru fiecare Manager cazări activ, **doar dacă vizita are cazare**: „Cerere de cazare: Marco Rossi – Studio, 28.10–02.11”.
  - `formatDateTime` folosește `Intl` cu `Europe/Chisinau` (constantă în `src/lib/format.js`).
- **`transferEvents.js`**:
  - `toTransferEvents(visits, from, to)` produce evenimentele calendarului:
    - `SOSIRE` → un eveniment la `arrivalAt`;
    - `PLECARE` → un eveniment la `departureAt`;
    - `DUS_INTORS` → ambele.
  - Fiecare eveniment: `{ id, kind, at, names: [„Marco Rossi”, …], isFree, visitId }`, doar dacă e în intervalul cerut.

### 3. Rute noi (toate după `requireAuth` + `readOnlyGuard`, montate în [app.js](../../backend/src/app.js))

**`routes/visits.js`:**
| Metodă | Rută | Roluri (Admin trece mereu) |
|---|---|---|
| GET | `/api/visits` | Coordonator, Back office, Contabil, Control calitate |
| GET | `/api/visits/:id` | aceleași + Manager cazări |
| POST | `/api/visits` | Coordonator |
| PATCH | `/api/visits/:id/back-office-status` | Back office |

- **Lista:** vizitele sortate după `arrivalAt`, cu persoane, tratament, cazare, transfer, numele coordonatorului și statusul Back office.
- **POST:**
  1. Se verifică faptul că `coordinatorId` e un **coordonator activ** (altfel 400 „Coordonator invalid”).
  2. Într-o **tranzacție** (`prisma.$transaction`):
     - se creează vizita cu persoanele, tratamentele, cazarea și transferul (create imbricat, ca în `personData()` din seed);
     - `createdById = req.user.id`, `hasCompanion` se calculează;
     - se citesc destinatarii (useri activi Back office / Manager cazări);
     - se face `notification.createMany`.
  3. Fie se salvează totul, fie nimic. Răspuns 201.
- **Status Back office:** doar `NEPRELUAT → INCEPUT → FINALIZAT`.
  - Se scrie cu `updateMany` + condiție pe statusul curent.
  - Dacă doi oameni apasă în același timp, doar primul reușește; celălalt primește 409 „Statusul a fost deja schimbat”. Asta e important la 50+ utilizatori.
  - Se completează `backOfficeStartedAt` / `backOfficeFinishedAt`.

**`routes/accommodations.js`:**
- `GET /api/accommodations` (Manager cazări, Contabil, Control calitate):
  - cererile cu numele persoanelor, datele sejurului, tipul, gratuit/zile, status;
  - sortate după sosire.
- `PATCH /api/accommodations/:id/status` (Manager cazări):
  - `NEPRELUCRAT → REZERVAT` + `reservedAt`;
  - aceeași protecție la clic dublu (409).

**`routes/transfers.js`:**
- `GET /api/transfers?from=…&to=…` (Șofer, Contabil, Control calitate):
  - vizitele cu transfer care au sosirea sau plecarea în interval → `toTransferEvents`.

**`routes/notifications.js`** (orice user conectat, doar notificările **proprii**):
- `GET /api/notifications` → `{ unreadCount, items }` (ultimele 20);
- `PATCH /api/notifications/:id/read` (`updateMany` cu `userId = req.user.id`, ca nimeni să nu marcheze notificările altcuiva);
- `POST /api/notifications/read-all`.

---

## Frontend

### Pachete
FullCalendar: `@fullcalendar/react`, `core`, `daygrid`, `timegrid`, `list`, instalate cu `npx npm@11 install`. Pentru limba română se folosește localizarea inclusă în pachet.

### Structură și navigare
- **`src/components/AppLayout.jsx`** (înlocuiește antetul din `HomePage`):
  - logo-text, meniul cu paginile rolului (tabelul de mai sus), clopoțelul, numele și „Ieșire”;
  - pe telefon, meniul se strânge sub un buton.
- **`src/navigation.js`:** lista paginilor per rol + `defaultPathFor(role)`. Pagina `/` trimite fiecare rol la prima lui pagină (Coordonator → Vizite, Șofer → Calendar etc.).
- **`src/labels.js`:** denumirile în română pentru tipuri de apartament, direcții, statusuri (lângă `roles.js`).
- **`src/format.js`:** dată și oră în format `ro-RO`, fusul `Europe/Chisinau`.
- **[App.jsx](../../frontend/src/App.jsx):** rutele noi protejate cu `ProtectedRoute roles={…}` (existent):

| Rută | Pagină |
|---|---|
| `/vizite` | `VisitsPage`: tabel (card pe telefon) cu sosire, plecare, persoane, coordonator, cazare/transfer da/nu, status |
| `/vizite/noua` | `NewVisitPage`: formularul |
| `/vizite/:id` | `VisitDetailsPage`: toate datele unei vizite |
| `/back-office` | `BackOfficePage` |
| `/cazari` | `AccommodationsPage` |
| `/transferuri` | `TransfersCalendarPage` |

### Formularul coordonatorului — `NewVisitPage.jsx`
1. **Pacient:** nume, prenume, tratament (obligatoriu), disponibilitate (comentariu).
2. **Însoțitor:**
   - bifă „Vine cu însoțitor” → nume și prenume;
   - bifă „Însoțitorul are tratament” → tratament și disponibilitate.
3. **Sejur:** sosire și plecare (`datetime-local`), convertite în ISO la trimitere.
4. **Cazare:**
   - bifă „Are nevoie de cazare” → tipul apartamentului;
   - „Gratuită” → câte zile.
5. **Transfer:**
   - bifă „Are nevoie de transfer” → gratuit sau contra cost;
   - direcția: Sosire / Plecare / Dus-întors.
6. **Coordonator responsabil:** listă din `GET /api/users/coordinators` (existent). Coordonatorul conectat e preselectat.

- Erorile de la server (`details[]`) apar lângă câmpul greșit, iar butonul e blocat cât timp se trimite.
- După salvare apare mesajul „Vizita a fost înregistrată, echipa a fost anunțată” și te duce la detaliile vizitei.

### Celelalte pagini
- **`BackOfficePage`:**
  - lista sortată după sosire, cu persoanele, tratamentul, disponibilitatea și statusul (insignă colorată);
  - butonul „Început” apare doar la `NEPRELUAT`, iar „Finalizat” doar la `INCEPUT`;
  - la 409 se arată mesajul și lista se reîncarcă.
- **`AccommodationsPage`:**
  - cererile cu insigna „Neprelucrat” sau „Rezervat”;
  - butonul „Marchează rezervat” apare doar la `NEPRELUCRAT`.
- **`TransfersCalendarPage`:**
  - FullCalendar; pe desktop, vederea pe săptămână (`timeGridWeek`) cu Zi / Lună; pe telefon, vederea listă (`listWeek`);
  - evenimentele se încarcă din `/api/transfers` pentru intervalul vizibil;
  - textul fiecărui eveniment e exact „Sosire 14:30 – Marco Rossi” / „Plecare 10:00 – Anna Schmidt, Thomas Schmidt”, construit de funcția `transferEventTitle(event)`;
  - culori diferite pentru Sosire și Plecare.
- **`NotificationBell.jsx`** (doar Back office / Manager cazări):
  - număr necitite, verificat la 30 de secunde și când revii în tab;
  - meniul arată ultimele notificări;
  - clic pe una → o marchează citită și te duce la pagina ta;
  - „Marchează toate ca citite”.
- **Contabil / Control calitate:** aceleași pagini, fără butoane de acțiune și cu mențiunea „Doar vizualizare”. Se folosește `isReadOnly` din [roles.js](../../frontend/src/roles.js).

`HomePage.jsx` dispare (înlocuit de redirect + `AppLayout`), iar testele de login se actualizează.

---

## Teste

**Backend:**
- **Fără bază (rulează și în CI):**
  - `tests/visit-validation.test.js`:
    - formular valid; câmpuri în plus;
    - plecare înainte de sosire;
    - gratuit fără zile / zile fără gratuit;
    - enum-uri greșite; texte prea lungi; tipuri greșite.
  - `tests/notifications.test.js`: cine primește ce; fără cazare → fără notificare pentru Manager cazări; textul mesajelor și ora Chișinău.
  - `tests/transfer-events.test.js`: Sosire / Plecare / Dus-întors (2 evenimente), filtrarea pe interval.
  - `tests/api.test.js`: rutele noi fără token → 401; `from/to` invalid → 400.
- **Cu baza `dev`: `tests/db-flow.test.js`.** Scrie în baza `dev`, deci **îți cer voie înainte să-l rulez**. Șterge la final tot ce a creat (vizitele create de test; notificările lor se șterg în cascadă).
  - Coordonatorul creează o vizită cu cazare și transfer → 201.
  - Back office și Manager cazări au fiecare câte o notificare; șoferii niciuna.
  - Fără cazare → Managerul de cazări nu primește notificare.
  - Șofer / Back office cu POST pe `/api/visits` → 403; Contabil cu POST/PATCH → 403; Contabil cu GET → 200.
  - Coordonator invalid → 400.
  - Back office: Început → Finalizat; a doua apăsare → 409; Finalizat direct din Neprelucrat → 409.
  - Cazare → Rezervat; a doua oară → 409.
  - `/api/transfers` conține evenimentele vizitei; lista vizitelor e sortată după sosire.
  - Notificări: un user nu poate marca notificarea altui user.

**Frontend (fetch simulat):**
- navigarea per rol;
- formularul (bifele arată/ascund câmpurile; corpul trimis e corect; erorile apar lângă câmpuri);
- Back office (butoanele corecte pe status; Contabil nu vede butoane);
- cazări;
- clopoțelul (număr, marcare citită);
- `transferEventTitle`.

FullCalendar nu se testează în jsdom; testăm funcțiile noastre.

---

## Ordinea de lucru și commit-urile (le faci tu)

| # | Ce fac eu | Commit propus |
|---|---|---|
| 1 | `docs/planuri/04-fluxul-vizitei.md` + cuprinsul din `docs/README.md` | `docs: add plan 04 (visit registration flow)` |
| 2 | `schemas/visit.js` + teste de validare | `feat(api): add strict validation for visit registration` |
| 3 | `services/notifications.js`, `services/transferEvents.js`, `lib/format.js` + teste | `feat(api): add notification and transfer event builders` |
| 4 | `routes/visits.js` (listă, detalii, creare cu notificări, status Back office), montare în `app.js` | `feat(visits): add visit registration with automatic team notifications` |
| 5 | `routes/accommodations.js`, `routes/transfers.js`, `routes/notifications.js` | `feat(api): add accommodations, transfers calendar and notifications endpoints` |
| 6 | `tests/db-flow.test.js` + `api.test.js` (rulez după confirmarea ta) | `test(backend): cover visit flow, roles and status transitions` |
| 7 | `navigation.js`, `labels.js`, `format.js`, `AppLayout`, `NotificationBell`, rute | `feat(frontend): add role-based layout, navigation and notifications bell` |
| 8 | `NewVisitPage`, `VisitsPage`, `VisitDetailsPage` | `feat(frontend): add visit registration form and visits list` |
| 9 | `BackOfficePage`, `AccommodationsPage` | `feat(frontend): add back office and accommodation pages` |
| 10 | FullCalendar + `TransfersCalendarPage` | `feat(frontend): add driver transfers calendar` |
| 11 | teste frontend + actualizarea testelor de login | `test(frontend): cover visit flow pages and role navigation` |
| 12 | `docs/arhitectura.md` (rutele API, fișierele noi) + secțiunea „Ce s-a implementat / abateri” | `docs: document visit flow API and update plan 04` |

- Mă opresc după fiecare pas și îți spun ce fișiere să bifezi.
- La final: push, PR **`feat: visit registration flow with team notifications`** (îți dau descrierea), bifa verde în CI, merge.

---

## Verificare
1. `npm test` în `backend` (inclusiv `db-flow`, după acordul tău) și în `frontend`; `npm run lint` și `npm run build` în `frontend`.
2. Manual, cu ambele servere pornite:
   - **coordonator1:** creezi o vizită cu însoțitor cu tratament, cazare gratuită 3 zile, transfer dus-întors → mesajul de succes → apare în Vizite.
   - **backoffice:** clopoțelul arată 1 → vizita e în listă, la locul ei după sosire → Început → Finalizat.
   - **cazari:** clopoțelul arată 1 → cererea e „Neprelucrat” → „Rezervat”.
   - **sofer1:** în calendar apar „Sosire HH:MM – …” și „Plecare HH:MM – …”, fără notificări.
   - **contabil / calitate:** văd toate paginile, fără butoane; un PATCH trimis manual → 403.
   - Pe lățime de telefon (DevTools): formularul, listele și calendarul (vederea listă) arată bine.
3. Același flux de două ori în paralel (două taburi Back office apasă „Început”) → unul reușește, celălalt primește mesajul de status deja schimbat.

## Ce s-a implementat / abateri de la plan

### Rezultat
- **Backend:**
  - validarea formularului;
  - crearea vizitei și a notificărilor într-o tranzacție;
  - listele vizitelor și ale cazărilor, ordonate după sosire;
  - statusurile Back office și cazare, protejate la apăsări simultane (409);
  - calendarul șoferului;
  - notificările proprii fiecărui utilizator.
- **Frontend:**
  - antet cu meniu pe roluri și clopoțel;
  - formularul „Vizită nouă”;
  - lista și detaliile vizitelor;
  - paginile Back office și Cazări;
  - calendarul FullCalendar.

  Fiecare rol ajunge după login direct pe prima lui pagină.
- **Teste:** **213** în backend (inclusiv fluxul complet pe Neon `dev`, cu ștergerea datelor de test la final) și **39** în frontend. Lint și build fără avertismente.
- **Verificat pe baza `dev`:**
  - după rularea testelor, baza a rămas exact ca după seed (10 vizite, 8 cazări, 8 transferuri, 0 notificări);
  - cele 8 cereri de cazare din seed vin sortate după sosire;
  - calendarul întoarce evenimentele din seed;
  - accesul fiecărui rol e cel din tabelul de mai sus.

### Abateri
| Plan | Ce s-a făcut | De ce |
|---|---|---|
| Testele frontend toate la pasul 11 | Testele formularului (pasul 8) și ale paginilor de status (pasul 9) au intrat în commit-urile paginilor; la pasul 11 au rămas meniul, clopoțelul și textul din calendar | erorile se prind imediat; fiecare commit vine cu testele lui |
| — | `src/test/helpers.jsx`: serverul simulat și utilizatorii demo, comune tuturor testelor frontend | fără cod copiat între teste |
| `HomePage` dispare la pasul 7 | A rămas până la pasul 10 (pagina de bun venit, în noul antet), apoi a fost înlocuită de `HomeRedirect` | până la pasul 10 nu existau încă toate paginile spre care să trimită |
| — | Rolul utilizatorului apare în antet, sub nume | după dispariția paginii de bun venit, rolul trebuia afișat altundeva |
| FullCalendar (fără versiune) | **6.1.22**, nu 7.x | seria 7 e foarte nouă și cere încă un pachet (`temporal-polyfill`); seria 6 e stabilă și bine documentată |
| — | Calendarul se încarcă doar când e deschis (`lazy`) | FullCalendar are ~230 KB; ceilalți utilizatori nu-l mai descarcă, iar build-ul nu mai dă avertismentul de 500 KB |
| `transfersRangeSchema` în `schemas/visit.js` | În `schemas/transfer.js` | ține de calendar, nu de formularul vizitei |
| — | `lib/params.js` (`parseId`), `services/visits.js` (ce se încarcă și forma trimisă clientului) | cod refolosit de mai multe rute |
| Mesajul pentru Manager cazări | Conține și „gratuită N zile” când e cazul | informația e utilă la căutarea apartamentului |
| Clic pe notificare → pagina rolului | Clic pe notificare → **detaliile vizitei** din notificare | găsit la testarea manuală: Back office era deja pe pagina lui, deci clicul doar marca notificarea citită, fără nicio schimbare vizibilă |

### Limitări cunoscute
- Listele de vizite și de cazări nu sunt împărțite pe pagini. Merge bine pentru volumul unei clinici; la mii de vizite s-ar adăuga paginare sau filtre.
- Notificările se verifică la 30 de secunde (nu instant). E suficient pentru flux și nu cere conexiuni permanente pe Render.
- Grila calendarului și câmpurile de dată din formular folosesc ora calculatorului. Textele afișează ora Chișinăului. La clinică cele două coincid. _(Rezolvat în [planul 07](07-code-review-reparatii.md): formularul și calendarul folosesc acum ora clinicii pe orice calculator. Tot acolo, Managerul de cazări vede doar detaliile vizitelor cu cazare, fără tratament.)_
