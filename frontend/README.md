# Punto Bianco — frontend

Interfața aplicației Punto Bianco: React 19 + Vite + Tailwind CSS v4, publicată pe Vercel.

```powershell
npm install        # dacă apare eroarea "edgesOut": npx npm@11 install
npm run dev        # http://localhost:5173 (backend-ul pe http://localhost:3000)
npm test           # teste automate, cu serverul simulat
npm run lint       # oxlint
npm run build      # versiunea pentru publicare, în dist/
```

Adresa backend-ului se pune în `.env` sau `.env.local` (vezi `.env.example`): `VITE_API_URL`.

Documentația completă (pornire, arhitectură, sistemul de design, teste, planuri): [docs/README.md](../docs/README.md) și [docs/arhitectura.md](../docs/arhitectura.md).
