// Rulează înaintea fiecărui fișier de test
import '@testing-library/jest-dom/vitest'
import { afterEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'
import { tokenStorage } from '../api'
import { unexpectedRequests } from './helpers'

// jsdom nu derulează pagini (window.scrollTo nu există acolo); îl înlocuim cu o funcție goală
window.scrollTo = () => {}

afterEach(() => {
  cleanup()
  localStorage.clear()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  tokenStorage.clear() // și tokenul ținut în memorie (când localStorage e blocat)

  // O cerere nesimulată înseamnă că pagina a cerut altceva decât știe testul: testul pică
  const unexpected = unexpectedRequests.splice(0)
  if (unexpected.length > 0) {
    throw new Error(`Cereri nesimulate în test: ${[...new Set(unexpected)].join(', ')}`)
  }
})
