import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.js'],
    setupFiles: ['tests/setup.js'],
    // Testele de integrare fac cereri la Neon; le dăm mai mult timp
    testTimeout: 20000,
  },
});
