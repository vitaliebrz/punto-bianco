# Plan 05 — Ziua 3, partea 1: design (brand, Tailwind, redesign complet)

**Ziua 3** · Ramura: `feature/brand-design` · Status: **finalizat**

## Context
Fluxul complet funcționează (Ziua 2, PR #4 și #5). Tema cere ca aplicația să arate bine și pe telefon, să folosească logo-ul și culorile companiei și toată familia de fonturi MULLER. Acum aspectul e minimal (CSS scris de mână, fără logo, font de sistem).

**Decizii luate cu tine:**
- **Redesign complet** al aspectului. Funcțiile, adresele paginilor și textele rămân aceleași; nu adăugăm funcții noi.
- **Tailwind CSS v4** (cu pluginul de Vite) în locul CSS-ului scris de mână.
- **Doar mod luminos** (fără dark mode).
- **Fontul: MULLER**, din `brand/muller-narrow.zip`: Muller Medium (+ italic) și ExtraBold; Muller Narrow Light, Medium, ExtraBold (+ italic). _Prima arhivă (MULLER Trial) a fost abandonată, vezi mai jos._
- **Logo-ul:** `brand/logo-punto-bianco.png`.

**De ce nu MULLER Trial:** varianta *Trial* (din `brand/Muller (1).zip`) înlocuiește intenționat unele caractere (ă, ș, ț, î, @ și punctele din câmpul de parolă) cu semnul „TRIAL FONT”, deci textele românești și adresele de email nu se pot citi; licența ei interzicea și repo-ul public și site-ul public. Fișierele din `muller-narrow.zip` au toate diacriticele și @ (verificat desenând textul cu fiecare font). **Arhiva nu conține un fișier de licență**; dreptul de folosire al acestor fișiere e asumat de tine, la fel ca riscul discutat pentru varianta Trial.

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
- **Font:** MULLER. Nu există Regular (400), deci Medium acoperă textul normal și etichetele (grosimi 300-600), iar ExtraBold titlurile (601-900). Muller Narrow (`font-narrow`) e pentru texte care trebuie să încapă în spațiu mic. Fișiere `.otf` (~75-90 KB fiecare); browserul descarcă doar ce folosește pagina.
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
| 2 | fonturile MULLER (9 fișiere `.otf`) în `frontend/public/fonts/muller/`; logo decupat, favicon și iconița pentru telefon în `frontend/public/brand/`; `brand/` (materialele sursă) exclus din git | `feat(frontend): add Muller fonts and logo assets` |
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

### Rezultat
- **Toate ecranele refăcute** pe Tailwind v4, cu sistemul de design al brandului: login, cadrul aplicației, Vizite, Detalii, Vizită nouă, Back office, Cazări, Calendar și clopoțelul. CSS-ul vechi (`legacy.css`) a fost șters.
- **Fontul MULLER** (Medium, ExtraBold și Muller Narrow) e folosit în toată aplicația.
- **Logo-ul original** e refăcut fidel: cercul cu dintele și textul „PUNTO BIANCO” cu majuscule, cu literele originale.
- **Teste:** 46 în frontend (40 înainte de acest plan), toate trec; lint și build fără avertismente. Backend-ul nu s-a schimbat.
- **Verificat manual** pe calculator și pe un telefon real (iPhone, prin rețeaua locală).

### Abateri
| Plan | Ce s-a făcut | De ce |
|---|---|---|
| MULLER Trial (24 de fișiere `.woff2`) | MULLER din `muller-narrow.zip` (9 fișiere `.otf`) | varianta Trial înlocuiește ă, ș, ț, î, @ și punctele parolei cu „TRIAL FONT” (login-ul nu se putea folosi); vezi „De ce nu MULLER Trial”. Între timp s-a încercat și Plus Jakarta Sans (Google), apoi s-a revenit la MULLER, cerut explicit de temă. Fonturile Trial au fost scoase și din istoricul ramurii, înainte de publicare |
| Griul brandului = `ink-500` | `ink-600` = `#565555`; `ink-500` = `#6E6C6C` | `ink-500` e folosit pentru textul secundar și avea nevoie de contrast mai bun |
| Logo: doar dintele, decupat | Dintele **și** textul „PUNTO BIANCO” din original, ca măști; cercul refăcut în CSS | logo-ul original e alb (pentru fundal închis): textul și cercul nu se vedeau pe alb și scăpaseră la decupare |
| Calendarul la pasul 10 | Refăcut imediat după pasul 5, într-un fișier separat (`calendar.css`) | CSS-ul FullCalendar câștiga în fața stilurilor din stratul Tailwind (butoane și evenimente albastre) |
| Login: doar formularul | + buton cu ochi pentru a arăta / ascunde parola | cerut la testare |
| Formular: butoanele lipite jos pe telefon | Pe telefon și tabletă stau la final; lipite jos doar pe ecrane late, cu mouse | pe telefon, bara lipită stătea deasupra tastaturii și acoperea câmpurile |
| Coordonatorul: listă `<select>` | Listă proprie (`Listbox`), cu inițiale și tastatură | cerut la testare: lista standard arăta diferit de restul formularului |
| — | Asterisc roșu la câmpurile obligatorii (și `aria-required`) | cerut la testare |
| — | Rezumat pe statusuri pe Back office și Cazări (doar informativ) | o privire de ansamblu pentru echipă; nu e o funcție nouă (fără filtre) |
| Pasul 11 (teste) separat | Testele adaptate la fiecare pas, în același commit cu pagina | fiecare commit rămâne cu testele trecute |

### Reparații găsite la testarea pe telefon
| Problemă | Cauză | Reparație |
|---|---|---|
| Pagina se mărea singură la login și rămânea mărită | Safari mărește pagina la câmpurile cu text sub 16 px | câmpurile au 16 px pe telefon |
| Comutatoarele nu mergeau din prima atingere | țintă mică + așteptarea pentru „dublă atingere = mărire” | tot rândul e ținta; `touch-action: manipulation` |
| Câmpurile de dată erau complet albe pe iPhone | Safari nu afișează nimic într-un câmp de dată gol | text „Alege data și ora” + iconiță de calendar |
| Pagina nouă se deschidea derulată jos | aplicația schimbă paginile fără reîncărcare | `ScrollToTop` la fiecare schimbare de adresă |
| Ecran alb pe telefon | `scrollTo({ behavior: 'instant' })` dă eroare în Safari mai vechi | `scrollTo(0, 0)` + `ErrorBoundary` (mesaj în loc de ecran alb) |
| Rânduri suprapuse în lista Vizite | textul nu se putea îngusta în coloană | textul trece pe rândul următor; tabelul doar de la 1280 px |

### Incident: baza `dev` ștearsă automat
Ramura Neon `dev` fusese creată cu **Auto-delete after 1 day**. După ștergere, backend-ul răspundea „Eroare internă” la orice cerere (`Authentication failed against database server`). Ramura a fost refăcută din cea principală, cu Auto-delete pe **Never**. Nota a fost adăugată în `docs/README.md`.
