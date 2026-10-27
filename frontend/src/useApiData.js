import { useCallback, useEffect, useState } from 'react'
import { apiFetch } from './api'

// Încarcă date de la API pentru o pagină: { data, error, loading, retryable, reload, setData }.
// reload() reîncarcă; setData() actualizează local (ex. după un buton de status).
// retryable: eroarea poate trece la o nouă încercare (rețea, server); nu și „nu există” / „fără acces”.
//
// Datele sunt legate de adresa de la care au venit (`path`). Când adresa se schimbă
// (ex. de la /api/visits/1 la /api/visits/2, aceeași pagină), datele vechi nu se mai arată:
// pagina e „se încarcă” până vine răspunsul pentru noua adresă.
export function useApiData(path) {
  const [state, setState] = useState({ path: null, data: null, error: '', errorStatus: null, loading: true })
  const [version, setVersion] = useState(0)

  useEffect(() => {
    let active = true
    apiFetch(path)
      .then((data) => {
        if (active) setState({ path, data, error: '', errorStatus: null, loading: false })
      })
      .catch((err) => {
        if (active) setState({ path, data: null, error: err.message, errorStatus: err.status, loading: false })
      })
    // Răspunsul unei cereri vechi (ex. pagina a fost închisă sau adresa s-a schimbat) e ignorat
    return () => {
      active = false
    }
  }, [path, version])

  // „Reîncearcă” după o eroare: arată din nou „se încarcă”.
  // Reîncărcarea unei liste afișate (ex. după un 409) păstrează lista pe ecran până vine cea nouă.
  const reload = useCallback(() => {
    setState((current) => (current.data === null ? { ...current, error: '', loading: true } : current))
    setVersion((value) => value + 1)
  }, [])

  const setData = useCallback((update) => {
    setState((current) => ({
      ...current,
      data: typeof update === 'function' ? update(current.data) : update,
    }))
  }, [])

  const current = state.path === path
  return {
    data: current ? state.data : null,
    error: current ? state.error : '',
    loading: !current || state.loading,
    // 0 = serverul nu răspunde; 5xx = eroare de server. 4xx (ex. 404 „Vizita nu există”) nu se repară reîncercând.
    retryable: current && (state.errorStatus === 0 || state.errorStatus >= 500),
    reload,
    setData,
  }
}
