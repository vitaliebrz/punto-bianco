import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // La pornire, Vite analizează TOATE fișierele aplicației (inclusiv paginile încărcate mai târziu,
  // ex. calendarul) și împachetează de la început toate bibliotecile (React, iconițele).
  // Altfel, când descoperea o bibliotecă nouă în timpul lucrului, refăcea pachetele, iar browserul
  // rămânea cu două versiuni de React amestecate -> ecran alb („504 Outdated Optimize Dep”).
  optimizeDeps: {
    entries: ['index.html', 'src/**/*.{js,jsx}', '!src/test/**'],
  },
  // Teste (npm test): browser simulat cu jsdom
  test: {
    environment: 'jsdom',
    setupFiles: ['src/test/setup.js'],
  },
})
