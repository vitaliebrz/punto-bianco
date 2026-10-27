# Plan 07 — Code review înainte de publicare: reparații

**Ziua 3** · Ramura: `fix/code-review-findings` · Status: **în lucru**

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

## Ce s-a implementat / abateri de la plan
_Se completează la final._
