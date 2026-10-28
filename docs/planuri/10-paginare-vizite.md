# Plan 10 — Paginarea tabelului de vizite

**Ziua 4** · Ramura: `feature/visits-pagination` · Status: **finalizat**

## Context
Pagina „Vizite” arată acum **toate** vizitele într-o singură listă. Cu timpul, lista devine foarte lungă și greu de parcurs, mai ales pe telefon.

**Ce vrem:**
- maxim **10 vizite pe pagină**;
- dacă sunt mai mult de 10, sub tabel apar butoanele **„Înapoi”** și **„Înainte”** (cu săgeți) și textul „Pagina 2 din 5”;
- cu 10 vizite sau mai puține, butoanele nu apar.

## Decizii
- **Ordinea rămâne cea de acum:** după data sosirii, de la cea mai apropiată/veche la cea mai târzie, pe toate paginile. Pagina 1 are primele 10 din această ordine, pagina 2 următoarele 10 etc.
- **Paginarea se face în browser.** Serverul trimite în continuare toată lista (`GET /api/visits` nu se schimbă), iar pagina arată câte 10.
  - De ce: nu se schimbă API-ul (îl folosesc și pagina Back office, testul de încărcare și integrarea Bitrix24), iar schimbarea e mică și sigură.
  - Pentru o clinică, câteva sute de vizite se încarcă rapid. Când vor fi mii, următorul pas e paginarea pe server (`?page=`), fără să se schimbe ce vede utilizatorul.
- **Pagina curentă stă în adresă:** `/vizite?pagina=2`. Așa:
  - un refresh rămâne pe aceeași pagină;
  - după ce deschizi o vizită și apeși „Înapoi” în browser, revii la pagina de unde ai plecat.
- **O pagină care nu există** (ex. `?pagina=99` sau `?pagina=abc`) arată cea mai apropiată pagină validă (prima sau ultima), nu o listă goală.
- **Doar pagina „Vizite”.** Componenta de paginare e separată, ca să poată fi folosită și în alte pagini dacă va fi nevoie.

## Frontend
- **`frontend/src/pagination.js`** (funcții simple, ușor de testat):
  - `PAGE_SIZE = 10`;
  - `pageCount(total)` → numărul de pagini (minim 1);
  - `clampPage(value, total)` → transformă `?pagina=` într-un număr valid între 1 și ultima pagină;
  - `pageItems(items, page)` → cele 10 elemente ale paginii.
- **`frontend/src/components/Pagination.jsx`:**
  - `<nav aria-label="Paginare">` cu butonul „Înapoi” (`CaretLeft`), textul „Pagina X din Y” și butonul „Înainte” (`CaretRight`);
  - „Înapoi” e blocat pe prima pagină, „Înainte” pe ultima;
  - pe telefon, butoanele sunt destul de mari pentru deget; textul rămâne între ele.
- **[VisitsPage.jsx](../../frontend/src/pages/VisitsPage.jsx):**
  - citește `pagina` cu `useSearchParams`;
  - afișează doar vizitele paginii curente;
  - sub tabel: `Pagination`, doar dacă sunt mai mult de 10 vizite;
  - descrierea din antet arată și totalul, ex. „47 de vizite, în ordinea datei de sosire.”;
  - la schimbarea paginii, ecranul urcă la începutul tabelului.

## Teste
- **`src/test/pagination.test.js`:** `pageCount`, `clampPage` (0, negativ, text, peste ultima pagină), `pageItems` (prima, ultima pagină incompletă).
- **`src/test/visits-pagination.test.jsx`** (cu 23 de vizite):
  - prima pagină arată vizitele 1–10, „Înapoi” e blocat;
  - „Înainte” → vizitele 11–20, adresa devine `?pagina=2`;
  - ultima pagină arată 3 vizite, „Înainte” e blocat;
  - `/vizite?pagina=99` deschide ultima pagină;
  - cu 10 vizite, paginarea nu apare.

## Pași și commit-uri (le faci tu)
| # | Conținut | Commit propus |
|---|---|---|
| 1 | acest plan + cuprinsul `docs/README.md` | `docs: add plan 10 (visits pagination)` |
| 2 | `pagination.js`, `Pagination.jsx`, `VisitsPage.jsx` + teste | `feat(frontend): paginate the visits table` |
| 3 | `docs/arhitectura.md`, `docs/README.md` (numărul de teste) + „Ce s-a implementat” | `docs: document visits pagination and update plan 10` |

La final: PR **`feat: paginate the visits table`**.

## Verificare
1. În `frontend`: `npm test`, `npm run lint -- --deny-warnings`, `npm run build`.
2. Manual, ca **coordonator** (datele demo au mai mult de 10 vizite; dacă nu, adaugi câteva):
   - prima pagină are 10 rânduri, „Înapoi” e blocat;
   - „Înainte” până la ultima pagină, apoi „Înapoi”;
   - deschizi o vizită de pe pagina 2, apeși „Înapoi” în browser → ești tot pe pagina 2;
   - pe telefon, butoanele se apasă ușor.

## Ce s-a implementat / abateri de la plan

### Rezultat
- **Pagina „Vizite”** arată câte 10 vizite, în ordinea datei de sosire, cu „‹ Înapoi”, „Pagina X din Y” și „Înainte ›” sub tabel. Cu 10 vizite sau mai puține, butoanele nu apar.
- **Pagina stă în adresă** (`/vizite?pagina=2`); pagina 1 nu adaugă nimic în adresă (`/vizite`).
- **Antetul** arată totalul: „23 de vizite, în ordinea datei de sosire.” (cu „de” de la 20 în sus, ca în română).
- **Teste:** 17 pentru `pagination.js`, 6 pentru pagina cu 23 de vizite. Frontend: 131 de teste, lint fără avertismente, build OK.

### Abateri
| Plan | Ce s-a făcut | De ce |
|---|---|---|
| — | **reparație în plus:** cursorul „mânuță” pe toate butoanele (`index.css`), commit separat | găsită la verificarea manuală: Tailwind v4 lasă săgeata pe butoane, inclusiv pe Înapoi / Înainte și pe butoanele din Back office |
| testul „adresa devine `?pagina=2`” | testat invers: `/vizite?pagina=2` deschide direct vizitele 11–20 | în teste, adresa din `MemoryRouter` nu se vede; ce contează (refresh-ul păstrează pagina) e acoperit |
