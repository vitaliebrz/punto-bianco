// Comunicarea cu backend-ul: adresa API-ului, token-ul și tratarea erorilor într-un singur loc.
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'
const TOKEN_KEY = 'pb_token'

// localStorage poate lipsi (ex. mod privat cu stocare blocată), de aceea try/catch
export const tokenStorage = {
  get() {
    try {
      return localStorage.getItem(TOKEN_KEY)
    } catch {
      return null
    }
  },
  set(token) {
    try {
      localStorage.setItem(TOKEN_KEY, token)
    } catch {
      // sesiunea rămâne doar până la închiderea paginii
    }
  },
  clear() {
    try {
      localStorage.removeItem(TOKEN_KEY)
    } catch {
      // nimic de șters
    }
  },
}

export class ApiError extends Error {
  constructor(message, status, details) {
    super(message)
    this.status = status
    this.details = details
  }
}

// Eveniment trimis când serverul spune că sesiunea nu mai e valabilă (401)
export const SESSION_EXPIRED_EVENT = 'pb:session-expired'

export async function apiFetch(path, { method = 'GET', body } = {}) {
  const headers = {}
  const token = tokenStorage.get()
  if (token) headers.Authorization = `Bearer ${token}`
  if (body !== undefined) headers['Content-Type'] = 'application/json'

  let res
  try {
    res = await fetch(API_URL + path, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
  } catch {
    throw new ApiError('Serverul nu răspunde. Verifică conexiunea.', 0)
  }

  const data = await res.json().catch(() => null)

  if (!res.ok) {
    if (res.status === 401 && token) {
      tokenStorage.clear()
      window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT))
    }
    throw new ApiError(data?.error || 'A apărut o eroare', res.status, data?.details)
  }

  return data
}
