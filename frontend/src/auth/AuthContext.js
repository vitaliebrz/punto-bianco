import { createContext } from 'react'

// Datele sesiunii: { user, loading, sessionError, checkSession, login, logout } — furnizate de <AuthProvider>
export const AuthContext = createContext(null)
