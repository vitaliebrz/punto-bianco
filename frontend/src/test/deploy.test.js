// Publicarea pe Vercel: orice adresă a aplicației (link direct, refresh) e servită de index.html,
// iar React Router afișează pagina. Fără regula din vercel.json, Vercel ar răspunde „404 Not Found”.
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

// testele rulează din folderul frontend/
const config = JSON.parse(readFileSync('vercel.json', 'utf8'))

// Unde trimite Vercel o adresă (regulile se aplică în ordine, prima potrivită câștigă)
function destinationOf(path) {
  const rule = config.rewrites.find(({ source }) => new RegExp(`^${source}$`).test(path))
  return rule?.destination ?? path
}

describe('vercel.json', () => {
  it.each(['/', '/login', '/vizite', '/vizite/12', '/back-office', '/cazari', '/transferuri', '/utilizatori'])(
    '%s -> /index.html',
    (path) => {
      expect(destinationOf(path)).toBe('/index.html')
    },
  )
})
