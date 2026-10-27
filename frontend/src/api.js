// Comunicarea cu backend-ul: adresa API-ului, token-ul și tratarea erorilor într-un singur loc.
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'
export const TOKEN_KEY = 'pb_token'
// După atâtea milisecunde fără răspuns, cererea se oprește („Serverul nu răspunde”)
export const REQUEST_TIMEOUT_MS = 20000

// localStorage poate lipsi (ex. mod privat cu stocare blocată). Atunci tokenul se ține doar în memorie:
// sesiunea merge până la închiderea paginii, în loc ca fiecare cerere după login să dea eroare.
let memoryToken = null
let storageWorks = true

export const tokenStorage = {
  get() {
    if (!storageWorks) return memoryToken
    try {
      return localStorage.getItem(TOKEN_KEY)
    } catch {
      return memoryToken
    }
  },
  set(token) {
    memoryToken = token
    try {
      localStorage.setItem(TOKEN_KEY, token)
      storageWorks = true
    } catch {
      storageWorks = false
    }
  },
  clear() {
    memoryToken = null
    storageWorks = true
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

  // Pe o rețea slabă cererea poate rămâne agățată; o oprim după REQUEST_TIMEOUT_MS
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  let res
  try {
    res = await fetch(API_URL + path, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    })
  } catch {
    throw new ApiError('Serverul nu răspunde. Verifică conexiunea.', 0)
  } finally {
    clearTimeout(timer)
  }

  const data = await res.json().catch(() => null)

  if (!res.ok) {
    // Deconectăm doar dacă cererea a plecat cu tokenul CURENT. Un 401 întârziat pentru un token vechi
    // (ex. sesiunea a expirat, utilizatorul s-a reconectat între timp, sau s-a logat în alt tab)
    // nu trebuie să șteargă sesiunea nouă.
    if (res.status === 401 && token && tokenStorage.get() === token) {
      tokenStorage.clear()
      window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT))
    }
    throw new ApiError(data?.error || 'A apărut o eroare', res.status, data?.details)
  }

  return data
}
