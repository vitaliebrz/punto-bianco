# Arhitectura

## Tehnologii

| Parte | Tehnologie | Publicare |
|---|---|---|
| Frontend | React + Vite | Vercel |
| Backend (API) | Node.js + Express 5 | Render |
| Bază de date | PostgreSQL | Neon |
| Acces la bază | Prisma 6 (schemă + migrări) | — |
| Autentificare | JWT + bcrypt | — |

Cerințe din temă care influențează arhitectura:
- **Responsive:** interfața trebuie să meargă și pe telefon.
- **Minim 50 de utilizatori simultan:** API-ul folosește un singur client Prisma, iar baza e accesată prin adresa *pooled* din Neon (un „pool” de conexiuni reutilizate).
- **Integrare ulterioară cu Bitrix24 și alte aplicații:** totul trece printr-un API REST (`/api/...`), iar vizitele au un câmp `externalId` pentru ID-ul din sistemul extern.
- **Doar date inventate:** baza se umple cu un script de seed.

## Structura repo-ului (monorepo)
```
punto-bianco/
├─ backend/
│  ├─ prisma/
│  │  ├─ schema.prisma        modelul de date
│  │  ├─ migrations/          fișierele SQL generate din schemă (versionate în git)
│  │  └─ seed.js              date demo inventate (npm run seed)
│  ├─ tests/                  teste automate (Vitest + Supertest)
│  ├─ src/
│  │  ├─ app.js               createApp(): aplicația Express — securitate, CORS, rute, erori
│  │  ├─ index.js             pornește aplicația pe un port
│  │  ├─ lib/prisma.js        clientul unic pentru baza de date
│  │  ├─ middleware/          auth.js (token, roluri, doar-citire), validate.js (zod)
│  │  ├─ schemas/             formele acceptate ale datelor (ex. login)
│  │  └─ routes/              auth.js (login, /me), users.js (coordonatori)
│  └─ .env.example            model pentru variabilele de mediu
├─ frontend/
│  └─ src/
│     ├─ api.js               singurul loc care vorbește cu backend-ul
│     ├─ auth/                sesiunea: AuthProvider, useAuth, ProtectedRoute
│     ├─ pages/               LoginPage, HomePage
│     ├─ test/                teste automate (Vitest + Testing Library)
│     └─ roles.js             denumirile rolurilor în română
├─ .github/workflows/ci.yml   GitHub Actions: lint, teste, build la fiecare PR
└─ docs/                      documentația (acest folder)
```

## Securitate și autentificare

**Fluxul de login:**
1. `POST /api/auth/login` primește **exact** `{ email, password }`, ambele text. Validarea se face cu zod, în mod strict: orice câmp în plus sau tip greșit → 400.
2. Parola e verificată cu bcrypt. Pentru un email inexistent, o parolă greșită sau un cont inactiv, răspunsul e același („Email sau parolă greșite”), cu același timp de răspuns.
3. Serverul trimite înapoi un token JWT (HS256, valabil 8 ore). Frontend-ul îl trimite la fiecare cerere în `Authorization: Bearer`.

**Fiecare cerere protejată trece prin:**
- `requireAuth`: verifică token-ul și încarcă userul **din bază**, ca un cont dezactivat să-și piardă accesul imediat;
- `readOnlyGuard`: Contabil și Control calitate pot face doar GET;
- `requireRole(...)`: pe rutele care cer un anumit rol; Admin are acces peste tot.

**Alte protecții:**
- **Limita de încercări:** 10 login-uri eșuate / 15 minute / IP → 429. IP-ul din `X-Forwarded-For` e luat în considerare doar cu `TRUST_PROXY`.
- **CORS:** API-ul poate fi chemat din browser doar de pe `FRONTEND_URL`.
- **helmet:** header-ele HTTP de securitate standard.
- **Corp JSON de maxim 10 KB.**
- **Erorile interne** nu trimit detalii tehnice clientului.

Ascunderea paginilor în frontend e doar pentru comoditate; protecția reală e întotdeauna în backend.

## Roluri

| Rol (în cod) | Denumire | Acces |
|---|---|---|
| `ADMIN` | Admin | tot |
| `COORDONATOR` | Coordonator tratament | înregistrează vizitele pacienților |
| `BACK_OFFICE` | Back office | lista vizitelor, statusuri Început / Finalizat |
| `MANAGER_CAZARI` | Manager cazări | cererile de cazare, Neprelucrat → Rezervat |
| `SOFER` | Șofer | calendarul transferurilor |
| `CONTABIL` | Contabil | **doar citire** |
| `CONTROL_CALITATE` | Control calitate | **doar citire** |

## Modelul de date

Tabelul central e **Visit** (vizita / sejurul): o venire a unui pacient la clinică, cu sosire, plecare și coordonatorul responsabil. De vizită țin persoanele, cazarea și transferul.

```mermaid
erDiagram
    User ||--o{ Visit : "coordonează"
    User ||--o{ Visit : "a creat"
    User ||--o{ Notification : "primește"
    Visit ||--|{ Patient : "1-2 persoane"
    Patient ||--o| Treatment : "are (opțional)"
    Visit ||--o| Accommodation : "cazare (opțional)"
    Visit ||--o| Transfer : "transfer (opțional)"
    Visit ||--o{ Notification : "despre"
```

| Tabel | Ce conține |
|---|---|
| `User` | contul unui membru al echipei: email, parolă (doar hash bcrypt), nume, rol, activ/inactiv |
| `Visit` | sosirea și plecarea (dată + oră, salvate în UTC), dacă vine cu însoțitor, coordonatorul, statusul Back office (`NEPRELUAT` → `INCEPUT` → `FINALIZAT`, cu momentele de început/sfârșit), `externalId` pentru Bitrix24 |
| `Patient` | o persoană din vizită: pacientul principal sau însoțitorul (`isCompanion`), plus disponibilitatea în timpul sejurului (comentariu) |
| `Treatment` | tratamentul (text liber) al unei persoane; însoțitorul fără tratament nu are rând aici |
| `Accommodation` | tipul apartamentului (studio / 1 dormitor + divan / 2 dormitoare / 2 dormitoare + living), dacă e gratuită și pentru câte zile, statusul `NEPRELUCRAT` / `REZERVAT` |
| `Transfer` | gratuit sau contra cost, direcția: `SOSIRE`, `PLECARE` sau `DUS_INTORS` |
| `Notification` | o notificare pentru un utilizator, legată de o vizită, cu marcajul „citit” |

Reguli de citit în model:
- **Lipsa unui rând înseamnă „nu e nevoie”:** dacă o vizită nu are rând în `Accommodation`, pacientul nu are nevoie de cazare. La fel pentru `Transfer`.
- **Ștergerea în cascadă:** ștergerea unei vizite șterge automat persoanele, tratamentele, cazarea, transferul și notificările ei.
- **Calendarul șoferului** nu are tabel propriu: se construiește din `Transfer`, din orele vizitei (`arrivalAt` / `departureAt`) și din numele persoanelor.

Schema completă: [backend/prisma/schema.prisma](../backend/prisma/schema.prisma).
