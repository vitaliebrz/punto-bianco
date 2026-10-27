# Plan 07 — Code review înainte de publicare: reparații

**Ziua 3** · Ramura: `fix/code-review-findings` · Status: **finalizat**

## Context
Înainte de publicare am rulat un code review automat pe tot codul (`backend/src`, `backend/prisma`, `backend/scripts`, `frontend/src`). A găsit **10 probleme**. Le reparăm pe toate înainte să publicăm aplicația. Fiecare reparație vine cu un test care dovedește că problema a dispărut.

Publicarea devine **planul 08**.

## Problemele și reparațiile

### 1. Ora din formular e citită în fusul orar al calculatorului (mare)
- **Problema:** câmpul „Sosire / Plecare” (`datetime-local`) dă o oră fără fus orar, iar `new Date("2026-11-02T14:30")` o interpretează în fusul calculatorului. Toată aplicația afișează însă ora Chișinăului. Un coordonator cu calculatorul pe alt fus (de exemplu în deplasare) salvează vizita cu o oră diferență.
- **Reparația:** `src/format.js` primește două funcții:
  - `clinicLocalToIso("2026-11-02T14:30")`: ora din formular este **ora Chișinăului** → ISO în UTC;
  - `isoToClinicLocal(iso)`: conversia inversă.

  Calculul folosește `Intl`, cu trecerea la ora de vară sau de iarnă inclusă. `visitForm.js` folosește `clinicLocalToIso`.
- **Teste:** ora „14:30” devine `12:30Z` iarna și `11:30Z` vara, **oricare ar fi fusul orar al calculatorului** (testele rulează cu fusuri diferite, de exemplu `TZ=America/New_York`).

### 2. Calendarul șoferului amestecă fusurile orare (mare)
- **Problema:** FullCalendar așază evenimentele în fusul telefonului, dar textul („Sosire 14:30 – …”) arată ora Chișinăului.
- **Reparația:** extensia oficială **`@fullcalendar/luxon3`** (+ `luxon`) și `timeZone="Europe/Chisinau"` pe calendar. Grila, ziua de azi, linia orei curente și textul folosesc toate ora clinicii.
- **Test:** funcția care dă opțiunile calendarului folosește fusul clinicii. FullCalendar nu rulează în jsdom, deci verificarea vizuală se face pe telefon.

### 3. Pagina arată date vechi când se schimbă adresa (medie)
- **Problema:** `useApiData` nu golește datele și nu arată „se încarcă” când se schimbă ruta (de exemplu, de la vizita 1 la vizita 2) sau la „Reîncearcă”.
- **Reparația:** la schimbarea adresei, datele vechi nu se mai afișează, ci apare scheletul. La „Reîncearcă” apare de asemenea scheletul. Reîncărcările după o acțiune (de exemplu după un 409) păstrează lista pe ecran.
- **Test:** treci de la vizita 42 la vizita 43; între timp nu se vede vizita 42, ci scheletul.

### 4. Un 401 întârziat deconectează o sesiune nouă (medie)
- **Problema:** `apiFetch` șterge orice token la un 401, chiar dacă tokenul cu care a fost trimisă cererea nu mai e cel curent.
- **Reparația:** tokenul se șterge, iar utilizatorul e deconectat, **doar dacă cererea a fost trimisă cu tokenul curent**.
- **Test:** o cerere cu tokenul vechi primește 401 după ce s-a salvat un token nou; tokenul nou rămâne.

### 5. Managerul de cazări poate citi orice vizită (medie, date medicale)
- **Problema:** `GET /api/visits/:id` permite rolului `MANAGER_CAZARI` orice vizită, inclusiv tratamentul pacienților fără cerere de cazare.
- **Reparația:** pentru `MANAGER_CAZARI`, ruta răspunde doar pentru vizitele **cu cazare**; altfel 404, ca o vizită inexistentă, ca să nu dezvăluie că există. Celelalte roluri rămân neschimbate.
- **Teste** (integrare, baza `dev`, cu ștergere la final): managerul de cazări vede o vizită cu cazare (200) și primește 404 pentru una fără cazare.

### 6. „Marchează toate ca citite” eșuează în tăcere (mică)
- **Reparația:** eroarea e prinsă și afișată în panoul clopoțelului.
- **Test:** POST `/read-all` răspunde 500, iar în panou apare mesajul de eroare.

### 7. Mesajul „Vizita a fost înregistrată” reapare la F5 (mică)
- **Reparația:** după afișare, marcajul `created` e șters din istoricul browserului (`navigate(..., { replace: true, state: null })`). Mesajul rămâne pe ecran până pleci de pe pagină, dar nu mai apare la reîncărcare.
- **Test:** după afișarea mesajului, starea din istoric nu mai conține `created`.

### 8. Scriptul de test: „local” recunoscut greșit (mică, siguranță)
- **Reparația:** `IS_LOCAL` verifică **host-ul exact** (`localhost`, `127.0.0.1`, `::1`), cu `new URL()`, nu doar începutul adresei. Adresele din rețea (`192.168.x`) nu mai pornesc scrierile automat; acolo trebuie `LOAD_WRITES=1` explicit.

### 9. Formatul erorilor de validare copiat (curățenie)
- **Reparația:** `validate(schema, { source: 'query' })` în `middleware/validate.js`; ruta calendarului îl folosește în loc de codul copiat.
- **Test:** `validate` cu `source: 'query'` validează `req.query` și pune datele curățate în `req.validatedQuery`. În Express 5, `req.query` nu se poate înlocui.

### 10. Cod duplicat în paginile frontend (curățenie)
- **Reparația:**
  - `costLabel` („Gratuită N zi/zile” / „Contra cost”) se mută în `labels.js`;
  - `Meta` (iconiță + valoare) devine o componentă comună;
  - `countBy` se mută într-un fișier comun.
- Testele existente ale paginilor trebuie să treacă neschimbate.

## Pași și commit-uri (le faci tu)
| # | Conținut | Commit propus |
|---|---|---|
| 1 | acest plan + cuprinsul `docs/README.md` | `docs: add plan 07 (code review fixes)` |
| 2 | problema 5 + teste | `fix(api): limit accommodation managers to visits with accommodation` |
| 3 | problema 9 + test | `refactor(api): validate query strings with the shared validate middleware` |
| 4 | problema 8 | `fix(backend): detect local API host exactly in the load test` |
| 5 | problema 1 + teste | `fix(frontend): read visit times in the clinic time zone` |
| 6 | problema 2 | `fix(frontend): show the transfers calendar in the clinic time zone` |
| 7 | problemele 3 și 4 + teste | `fix(frontend): avoid stale data and stale logouts` |
| 8 | problemele 6 și 7 + teste | `fix(frontend): report read-all errors and show the created banner once` |
| 9 | problema 10 | `refactor(frontend): share cost label and small helpers` |
| 10 | „Ce s-a implementat” + `docs/arhitectura.md` (fusul orar) | `docs: update plan 07 and architecture` |

La final: PR **`fix: code review findings before deployment`**.

## Verificare
- Toate testele backend (216 + noi) și frontend (46 + noi), plus lint și build.
- Testele cu ora rulează și cu alt fus orar al procesului (`TZ`).
- Pe telefon: calendarul și formularul cu fusul telefonului schimbat (Setări → Dată și oră → alt oraș) arată aceleași ore ca pe calculator.

## Runda 2 — review complet (fiecare fișier din proiect)
După primele 10 reparații am rulat un review pe **tot** proiectul: backend, frontend, teste, CI și documentație. N-a găsit probleme critice. Ce urmează se repară pe aceeași ramură, câte un pas pe rând.

### 11. Managerul de cazări primește date medicale (mare)
- **Problema:** `GET /api/visits/:id` îi trimite managerului de cazări și tratamentul, și disponibilitatea pacienților.
- **Reparația:**
  - `serializeVisit(visit, { medical })`: pentru `MANAGER_CAZARI`, persoanele vin fără `treatment` și `availability`;
  - pagina de detalii nu mai afișează blocul de tratament când acesta lipsește.
- **Teste:**
  - integrare: managerul de cazări primește vizita fără tratament, iar coordonatorul o primește cu tratament;
  - un test unitar pentru `serializeVisit`;
  - un test frontend pentru pagina de detalii.

### 12. Reguli de acces netestate (mare)
- `requireAuth`, testat cu Prisma simulat:
  - utilizator dezactivat → 401;
  - utilizator șters → 401;
  - rolul se citește din bază, nu din token.
- **Matrice rol × rută:** fiecare rol pe fiecare rută protejată → 403 unde n-are acces. De exemplu, șoferul nu vede lista vizitelor, iar contabilul nu poate modifica nimic.

### 13. Sesiunea (mare)
- **Mai multe tab-uri:** dacă ieși dintr-un tab, celelalte se deconectează și ele. Folosim evenimentul `storage`.
- **`localStorage` blocat:** tokenul se ține și în memorie, deci login-ul merge până la închiderea paginii.
- **Cereri blocate:** au o limită de timp de 20 s, apoi apare mesajul „Serverul nu răspunde…”.

### 14. Formular și butoane (medie)
- **Back office și Cazări:** fiecare card are propria stare „se salvează”. Același buton nu se mai poate trimite de două ori.
- **Tratamentul însoțitorului:**
  - e obligatoriu când e bifat (zod);
  - eroarea apare la câmpul lui.
- **După o eroare:**
  - focus pe primul câmp greșit;
  - eroarea dispare la modificarea câmpului;
  - erorile fără câmp apar în mesajul general;
  - data goală → „Câmp obligatoriu”.
- „Renunță” e blocat cât timp se salvează.
- `clinicLocalToIso` respinge datele imposibile (luna 13, ora 99).

### 15. Telefon, accesibilitate, mesaje vechi (medie)
- **Meniul de pe telefon:**
  - se închide la orice schimbare de pagină;
  - focusul revine pe butonul care l-a deschis;
  - conținutul din spate primește `inert`.
- **Lista coordonatorilor:** derulează la opțiunea activă.
- **Contrast:** textul `ink-400` devine `ink-500`, peste minimul de accesibilitate.
- **Mesajul „Vizita a fost înregistrată”:** nu mai reapare la „Înapoi”.
- **Butonul „Înapoi”:** fără istoric, duce la listă.
- **Butonul „Reîncearcă”:** nu mai apare la 404.
- **Răspunsurile întârziate** (calendar, clopoțel): sunt ignorate.
- **`HomeRedirect`:** nu mai cade pentru un rol fără pagini.

### 16. Siguranța bazei, testele și CI (medie)
- **`DB_WRITE_HOST`** (doar host-ul bazei dev). Dacă host-ul din `DATABASE_URL` diferă:
  - seed-ul refuză să ruleze;
  - testul de integrare se sare;
  - scriptul de încărcare nu curăță.
- **Testul de integrare:**
  - la pornire șterge resturile rulărilor întrerupte;
  - „citește toate” atinge doar notificările lui.
- **Scriptul de încărcare:** lista vizitelor cu cazare se umple corect.
- **Testele frontend:** dau eroare la cereri nesimulate și verifică parametrii din adresă.
- **CI:**
  - Node 22;
  - `prisma validate`;
  - avertismentele de lint opresc CI-ul;
  - `engines` în `package.json`;
  - `SEED_PASSWORD` gol în `.env.example`.

### 17. Documentația (mică)
- **`docs/arhitectura.md`:** fusul orar, regula managerului de cazări, componentele și arborele de fișiere.
- **`docs/README.md`:** numărul de teste, `prisma generate` la pornire, versiunea de Node, `DB_WRITE_HOST`.
- **Planurile vechi:**
  - linkurile din planul 04;
  - comenzile PowerShell în planul 06;
  - notițe acolo unde textul nu mai e valabil.
- **`frontend/README.md`:** o descriere a proiectului în locul șablonului Vite.

### Mutate în planul 08 (publicarea)
- `vercel.json` pentru linkurile directe;
- `TRUST_PROXY` validat strict;
- build și `prisma migrate deploy` pe Render;
- Node fixat;
- refuzul unui `JWT_SECRET` slab;
- oprire curată la redeploy.

### Limitări notate, fără reparație acum
- listele nu au paginare: e în regulă pentru volumul unei clinici, dar mai târziu va fi nevoie de un filtru pe perioadă;
- indexul `Notification(userId, createdAt)`;
- skip link și câte un `ErrorBoundary` pe fiecare pagină;
- `initials()` duplicat;
- regula de lint `exhaustive-deps`.

### Pași și commit-uri, runda 2
| # | Conținut | Commit propus |
|---|---|---|
| 11 | această secțiune | `docs: add full review findings to plan 07` |
| 12 | problema 11 + teste | `fix(api): hide treatment details from accommodation managers` |
| 13 | problema 12 | `test(backend): cover role access matrix and inactive users` |
| 14 | problema 13 + teste | `fix(frontend): sync logout across tabs and keep the session without storage` |
| 15 | problema 14 + teste | `fix: prevent double status updates and improve form errors` |
| 16 | problema 15 + teste | `fix(frontend): mobile menu, accessibility and stale responses` |
| 17 | problema 16 | `test: guard database writes and isolate integration tests` + `ci: run on Node 22 and fail on lint warnings` |
| 18 | problema 17 + „Ce s-a implementat” | `docs: update architecture, README and plan 07` |

## Ce s-a implementat / abateri de la plan

### Rezultat
- **Runda 1:** toate cele 10 probleme reparate, fiecare cu testul ei; plus 2 reparații găsite de un al doilea review automat (vezi abaterile).
- **Runda 2:** toate cele 7 grupuri reparate. Ce ține de server (punctul „Mutate în planul 08”) se face la publicare.
- **Teste:**

  | Moment | Backend | Frontend |
  |---|---|---|
  | înainte de plan | 216 | 46 |
  | după runda 1 | 218 | 65 |
  | după runda 2 | **285** | **92** |

  Toate trec, inclusiv testul de integrare pe Neon `dev`. Lint-ul (fără avertismente) și build-ul sunt curate.
- **Verificat manual pe telefon** (runda 1): calendarul și formularul în ora clinicii.

### Abateri — runda 1
| Plan | Ce s-a făcut | De ce |
|---|---|---|
| `isoToClinicLocal` (conversia inversă) | nu există | nicio pagină nu o folosea; formularul nu se editează |
| testele de oră rulate automat cu alt `TZ` | rulate manual cu `TZ=America/New_York`, `Asia/Tokyo` și `UTC` (notat în `format.test.js`) | Vitest nu poate schimba fusul orar al procesului după pornire; funcția nu folosește deloc ora calculatorului |
| test pentru fusul calendarului | fără test automat; verificat pe telefon cu alt fus orar | FullCalendar nu rulează în jsdom |
| `IS_LOCAL`: `localhost`, `127.0.0.1`, `::1` | `[::1]`, cu paranteze | așa întoarce `new URL()` host-ul IPv6 |
| `countBy` într-un fișier comun | `countByStatus` în `labels.js`, lângă etichetele de cost (și `transferCostLabel`) | sunt folosite de aceleași pagini |
| — | 2 commit-uri în plus: detaliile Managerului de cazări în testul de încărcare doar pentru vizitele cu cazare; o funcție nefolosită ștearsă | găsite de al doilea review automat |

### Abateri — runda 2
| Plan | Ce s-a făcut | De ce |
|---|---|---|
| matricea rol × rută în `api.test.js` | fișier nou, `tests/access.test.js` | are nevoie de baza simulată (`vi.mock`), iar `api.test.js` folosește aplicația fără simulare |
| tratamentul însoțitorului obligatoriu | obligatoriu **doar când e trimis**; lipsă sau `null` = fără tratament | un însoțitor fără tratament e un caz valid; problema era doar bifa cu câmpul gol |
| data goală → „Câmp obligatoriu” (formular) | mesajul vine din validarea de pe server (`schemas/visit.js`) | același mesaj pentru orice client al API-ului (ex. Bitrix24) |
| meniul se închide cu `useEffect` pe adresă | starea se ajustează în timpul randării, când adresa se schimbă | cu `useEffect`, întoarcerea la aceeași adresă (logo → „/” → aceeași pagină) redeschidea meniul |
| `PageState` fără „Reîncearcă” la 404 | `useApiData` dă `retryable`, folosit de toate cele 4 pagini cu date | „Reîncearcă” are rost doar pentru rețea și erori de server; la 403 sau 404 nu ajută |
| `DB_WRITE_HOST` pentru seed, test și curățenie | în plus, testul de încărcare scrie **doar** pe API-ul local | un server publicat poate avea altă bază decât `.env`; datele create nu ar fi fost șterse |
| mock-ul `fetch` aruncă la cereri nesimulate | arunca deja, dar pagina înghițea eroarea; acum testul pică (`setup.js`), iar `renderAs` simulează implicit clopoțelul gol | a găsit imediat un test care trecea fără să încarce vizita deschisă |
| verificarea parametrilor din adresă în teste | nu s-a făcut | singura pagină cu parametri e calendarul, care nu rulează în jsdom |
| răspunsurile întârziate în calendar: test | doar clopoțelul are test | FullCalendar nu rulează în jsdom |
| `--max-warnings=0` | `--deny-warnings` | opțiunea echivalentă din oxlint |
| planurile vechi rescrise | o notiță „actualizat ulterior” acolo unde textul nu mai e valabil (planurile 02, 03, 04, 06) | planurile rămân istoricul deciziilor |
| — | `frontend/README.md`: descrierea proiectului în locul șablonului Vite | — |

**Notă:** la pasul 12, testul de integrare a rulat o dată pe baza `dev` fără acordul cerut înainte: o comandă a pornit din folderul `backend` în loc de `frontend`. Testul a trecut și a șters vizitele create. Din pasul 17, testul nu mai poate rula fără `DB_WRITE_HOST`.
