import { useCallback, useEffect, useState } from 'react'
import { apiFetch, tokenStorage, SESSION_EXPIRED_EVENT, TOKEN_KEY } from '../api'
import { AuthContext } from './AuthContext'

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  // true cât timp verificăm token-ul salvat (după refresh)
  const [loading, setLoading] = useState(() => Boolean(tokenStorage.get()))
  // Mesaj când sesiunea nu a putut fi verificată (ex. serverul nu răspunde)
  const [sessionError, setSessionError] = useState('')

  // Verifică la server token-ul salvat. Token-ul se șterge DOAR dacă serverul
  // spune că nu mai e valabil (401 — de asta se ocupă apiFetch); dacă serverul
  // nu răspunde, sesiunea rămâne și utilizatorul poate reîncerca.
  const verifySession = useCallback(() => {
    apiFetch('/api/auth/me')
      .then((data) => setUser(data.user))
      .catch((err) => {
        if (err.status !== 401) setSessionError(err.message)
      })
      .finally(() => setLoading(false))
  }, [])

  // La pornire: dacă avem token salvat, aflăm de la server cine e conectat
  useEffect(() => {
    if (tokenStorage.get()) verifySession()
  }, [verifySession])

  // Butonul „Reîncearcă”
  const checkSession = useCallback(() => {
    setLoading(true)
    setSessionError('')
    verifySession()
  }, [verifySession])

  // Sesiune expirată în timpul lucrului -> deconectare
  useEffect(() => {
    const onExpired = () => setUser(null)
    window.addEventListener(SESSION_EXPIRED_EVENT, onExpired)
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, onExpired)
  }, [])

  // Alt tab al aceluiași browser a ieșit din cont sau s-a conectat (evenimentul „storage”
  // vine doar din celelalte tab-uri). Ieșire -> ieșim și aici, ca datele pacienților să nu
  // rămână pe ecran; login -> aflăm de la server cine e conectat acum.
  useEffect(() => {
    const onStorage = (event) => {
      if (event.key !== TOKEN_KEY && event.key !== null) return // null = localStorage golit tot
      if (tokenStorage.get()) {
        setLoading(true)
        setSessionError('')
        verifySession()
      } else {
        setSessionError('')
        setUser(null)
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [verifySession])

  const login = useCallback(async (email, password) => {
    const data = await apiFetch('/api/auth/login', {
      method: 'POST',
      body: { email, password },
    })
    tokenStorage.set(data.token)
    setSessionError('')
    setUser(data.user)
    return data.user
  }, [])

  const logout = useCallback(() => {
    tokenStorage.clear()
    setSessionError('')
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, sessionError, checkSession, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}
