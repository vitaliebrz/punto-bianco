import { createContext } from 'react'

// Datele sesiunii: { user, loading, login, logout } — furnizate de <AuthProvider>
export const AuthContext = createContext(null)
