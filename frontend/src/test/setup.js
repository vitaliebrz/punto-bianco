// Rulează înaintea fiecărui fișier de test
import '@testing-library/jest-dom/vitest'
import { afterEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'

// jsdom nu derulează pagini (window.scrollTo nu există acolo); îl înlocuim cu o funcție goală
window.scrollTo = () => {}

afterEach(() => {
  cleanup()
  localStorage.clear()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})
