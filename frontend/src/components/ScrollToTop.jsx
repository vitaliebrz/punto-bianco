import { useLayoutEffect } from 'react'
import { useLocation } from 'react-router-dom'

// Aplicația schimbă paginile fără reîncărcare, deci browserul păstrează derularea paginii anterioare.
// La fiecare schimbare de adresă, ducem pagina nouă la început (înainte să fie afișată, fără „săritură”).
export default function ScrollToTop() {
  const { pathname } = useLocation()

  useLayoutEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
  }, [pathname])

  return null
}
