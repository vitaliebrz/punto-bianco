import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Teste (npm test): browser simulat cu jsdom
  test: {
    environment: 'jsdom',
    setupFiles: ['src/test/setup.js'],
  },
})
