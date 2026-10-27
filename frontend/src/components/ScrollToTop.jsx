import { useLayoutEffect } from 'react'
import { useLocation } from 'react-router-dom'

// Aplicația schimbă paginile fără reîncărcare, deci browserul păstrează derularea paginii anterioare.
// La fiecare schimbare de adresă, ducem pagina nouă la început (înainte să fie afișată, fără „săritură”).
// Forma scrollTo(x, y) merge în toate browserele; varianta cu { behavior: 'instant' } dă eroare
// pe versiunile mai vechi de Safari (iPhone) și bloca toată aplicația (ecran alb).
export default function ScrollToTop() {
  const { pathname } = useLocation()

  useLayoutEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return null
}
