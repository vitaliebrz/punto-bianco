import { useCallback, useEffect, useState } from 'react'
import { apiFetch, tokenStorage, SESSION_EXPIRED_EVENT } from '../api'
import { AuthContext } from './AuthContext'

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  // true cât timp verificăm token-ul salvat (după refresh)
  const [loading, setLoading] = useState(() => Boolean(tokenStorage.get()))

  // La pornire: dacă avem token salvat, aflăm de la server cine e conectat
  useEffect(() => {
    if (!tokenStorage.get()) return
    apiFetch('/api/auth/me')
      .then((data) => setUser(data.user))
      .catch(() => tokenStorage.clear())
      .finally(() => setLoading(false))
  }, [])

  // Sesiune expirată în timpul lucrului -> deconectare
  useEffect(() => {
    const onExpired = () => setUser(null)
    window.addEventListener(SESSION_EXPIRED_EVENT, onExpired)
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, onExpired)
  }, [])

  const login = useCallback(async (email, password) => {
    const data = await apiFetch('/api/auth/login', {
      method: 'POST',
      body: { email, password },
    })
    tokenStorage.set(data.token)
    setUser(data.user)
    return data.user
  }, [])

  const logout = useCallback(() => {
    tokenStorage.clear()
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}
