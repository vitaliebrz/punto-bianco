# Plan 05 — Ziua 3, partea 1: design (brand, Tailwind, redesign complet)

**Ziua 3** · Ramura: `feature/brand-design` · Status: **în lucru**

## Context
Fluxul complet funcționează (Ziua 2, PR #4 și #5). Tema cere ca aplicația să arate bine și pe telefon, să folosească logo-ul și culorile companiei și toată familia de fonturi MULLER. Acum aspectul e minimal (CSS scris de mână, fără logo, font de sistem).

**Decizii luate cu tine:**
- **Redesign complet** al aspectului. Funcțiile, adresele paginilor și textele rămân aceleași; nu adăugăm funcții noi.
- **Tailwind CSS v4** (cu pluginul de Vite) în locul CSS-ului scris de mână.
- **Doar mod luminos** (fără dark mode).
- **Fontul: toată familia MULLER Trial** (12 grosimi + italic), din `brand/Muller (1).zip`.
- **Logo-ul:** `brand/logo-punto-bianco.png`.

**⚠ Licența fontului (asumată de tine):** MULLER Trial are licență *Fontfabric Trial EULA 1.0*. Aceasta permite doar uz necomercial și testare, interzice paginile web publice și redistribuirea fișierelor fără acordul Fontfabric. Repo-ul e public, iar aplicația va fi publicată, deci folosirea încalcă licența. Ți-am explicat riscul, iar tu ai ales această variantă. Varianta liberă (MULLER Demo) are doar ExtraBold și Thin. Fișierele fontului nu se modifică; licența cere păstrarea datelor despre autor din ele.

## Cum arată (direcția de design)
**Aplicație internă de lucru pentru echipa unei clinici stomatologice, folosită zilnic, și pe telefon (șoferul).** Stilul e calm și „medical-premium”: mult alb, menta brandului ca accent, gri închis pentru text, densitate medie. Animațiile sunt discrete și apar doar ca răspuns la acțiuni (apăsare, deschidere de meniu, schimbare de status).

### Sistemul de design (într-un singur loc: `@theme` din `src/index.css`)
**Culori**, pornind de la cele două culori ale brandului:

| Rol | Valoare | Folosire |
|---|---|---|
| `mint-300` | `#98D3C3` (brand) | buton principal, accente, elementul activ din meniu |
| `mint-50` … `mint-700` | nuanțe calculate din mentă | fundaluri deschise, texte pe mentă, insigna „gata” |
| `ink-500` | `#565555` (brand) | titluri, iconițe, text secundar închis |
| `ink-50` … `ink-900` | nuanțe din gri | fundalul paginii, borduri, text |
| galben / roșu | discrete | „în lucru” / erori |

- **Contrast:** pe mentă nu scriem cu alb (ar fi ilizibil); butonul principal are text gri foarte închis. Toate textele respectă WCAG AA.
- **Forme:** câmpuri și butoane cu colțuri de 12 px, carduri și panouri de 16 px, insignele complet rotunjite. Regula e aceeași peste tot.
- **Font:** MULLER. Text normal cu Regular (400), etichete cu Medium (500), titluri cu Bold (700) și ExtraBold (800). Se declară toate cele 12 grosimi + italic, dar browserul descarcă doar ce folosește pagina (~22 KB pe grosime).
- **Iconițe:** `@phosphor-icons/react`, o singură familie, aceeași grosime peste tot.
- **Logo:** PNG-ul are dintele gri foarte deschis (`#E2E3E4`), aproape invizibil pe alb. Îl decupez (fără spațiul gol din jur) și îl folosesc ca **mască CSS**, așa că se poate colora cu orice culoare a brandului (gri închis, mentă sau alb). Din el fac și iconița din tabul browserului (favicon) și iconița de pe telefon.

### Ecranele
- **Login, pe două coloane:**
  - stânga, un panou mentă cu logo-ul mare și numele clinicii;
  - dreapta, formularul;
  - pe telefon rămâne doar formularul, cu logo-ul deasupra.
- **Cadrul aplicației:**
  - **pe calculator:** bară laterală cu logo, meniul rolului (cu iconițe) și, jos, utilizatorul (nume, rol, „Ieșire”); sus, bara cu titlul paginii și clopoțelul;
  - **pe telefon:** bară sus cu logo, clopoțel și buton de meniu; meniul se deschide ca un panou glisant din stânga.
- **Liste** (Vizite, Back office, Cazări):
  - **pe calculator:** rânduri tip tabel, cu coloane aliniate (persoane, sosire, plecare, coordonator, cazare/transfer, status) și butonul de acțiune în dreapta;
  - **pe telefon:** carduri.
  - Ordinea rămâne cea de la server (după sosire).
- **Stări:**
  - **„Se încarcă…”** se înlocuiește cu **schelete**: forme gri care au aspectul conținutului.
  - **Liste goale:** iconiță + text explicativ.
  - **Erorile** apar într-un panou cu iconiță și butonul „Reîncearcă”.
- **Insigne de status** cu iconiță și culoare: gri = de făcut, galben = în lucru, mentă = gata.
- **Formularul „Vizită nouă”:**
  - Secțiunile sunt numerotate vizual, fiecare cu iconiță.
  - Bifele devin **comutatoare** (switch).
  - Gratuit / Contra cost și direcția transferului devin **butoane segmentate**.
  - Tipul apartamentului devine **4 carduri selectabile**.
  - Pe telefon, butonul „Înregistrează vizita” rămâne lipit jos.

  Tehnic rămân aceleași câmpuri (checkbox, radio), deci accesibilitatea și testele se păstrează.
- **Detaliile vizitei:** un antet cu persoanele și statusul, apoi secțiuni (Persoane, Sejur, Cazare, Transfer, Back office) în două coloane pe calculator.
- **Clopoțelul:**
  - panoul are iconiță pe tipul notificării și evidențiază notificările necitite;
  - pe telefon se deschide pe toată lățimea.
- **Calendarul:** FullCalendar primește fontul, culorile și butoanele brandului; sosirile sunt cu mentă, plecările cu gri.

### Animații (doar CSS, fără librărie)
- Apăsarea unui buton îl face ușor mai mic (`scale 0.98`).
- Panoul clopoțelului și meniul de pe telefon apar cu fade + slide scurt (150–200 ms).
- Scheletele au un puls lent.
- Toate se opresc la `prefers-reduced-motion`.

## Pași și commit-uri (le faci tu)

| # | Ce fac eu | Commit propus |
|---|---|---|
| 1 | acest plan + cuprinsul `docs/README.md` | `docs: add plan 05 (brand design)` |
| 2 | fonturile MULLER (24 fișiere `.woff2`) în `frontend/public/fonts/muller/`; logo decupat, favicon și iconița pentru telefon în `frontend/public/brand/`; `brand/` (arhivele sursă) exclus din git | `feat(frontend): add Muller font family and logo assets` |
| 3 | Tailwind v4 (`tailwindcss`, `@tailwindcss/vite`), `@theme` cu culori, font și forme; Phosphor | `chore(frontend): set up Tailwind CSS v4 and brand design tokens` |
| 4 | componente comune: `Button`, `StatusBadge`, `Skeleton`, `EmptyState`, `ErrorState`, `Logo`, `FormField`, `Switch`, `SegmentedControl` | `feat(frontend): add shared UI components` |
| 5 | cadrul aplicației: bara laterală, bara de sus, meniul de pe telefon, clopoțelul | `feat(frontend): redesign app shell and notifications bell` |
| 6 | pagina de login | `feat(frontend): redesign login page` |
| 7 | lista și detaliile vizitelor | `feat(frontend): redesign visits list and details` |
| 8 | formularul „Vizită nouă” | `feat(frontend): redesign new visit form` |
| 9 | Back office și Cazări | `feat(frontend): redesign back office and accommodation pages` |
| 10 | calendarul; ștergerea CSS-ului vechi | `feat(frontend): restyle transfers calendar` |
| 11 | testele adaptate la noul aspect (unde se schimbă structura) | `test(frontend): update tests for the redesigned UI` |
| 12 | `docs/arhitectura.md` + „Ce s-a implementat / abateri” | `docs: document design system and update plan 05` |

- Testele rulează la fiecare pas; dacă un pas schimbă structura unei pagini, testul ei se adaptează în același pas.
- Mă opresc după fiecare pas cu fișierele de bifat.
- La final: PR **`feat: brand design and responsive UI redesign`**.

## Ce NU se schimbă
- Rutele, API-ul, logica, validările, rolurile.
- Textele din interfață (etichete, butoane, mesaje), în afară de unde e nevoie pentru noul aspect (de exemplu titlul din bara de sus).
- Backend-ul: neatins.

## Verificare
1. `npm run lint`, `npm test`, `npm run build` în `frontend`.
2. Manual, la **375 px** (telefon) și **1280 px** (calculator), cu fiecare rol:
   - login;
   - meniul (cu panoul glisant pe telefon);
   - Vizite și detalii;
   - formularul complet (comutatoare, carduri, butonul lipit jos);
   - Back office („Început” / „Finalizat”);
   - Cazări („Rezervat”);
   - calendarul (vederea listă pe telefon);
   - clopoțelul.
3. Verificare de contrast pentru butoane, insigne și câmpuri. Navigare doar cu tastatura (Tab), cu focus vizibil.
4. Fonturile: în DevTools → Network se încarcă doar grosimile folosite; textele cu ă â î ș ț arată corect.

## Ce s-a implementat / abateri de la plan
_Se completează la final._
