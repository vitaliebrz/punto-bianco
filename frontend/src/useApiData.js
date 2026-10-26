import { useCallback, useEffect, useState } from 'react'
import { apiFetch } from './api'

// Încarcă date de la API pentru o pagină: { data, error, loading, reload, setData }.
// reload() reîncarcă; setData() actualizează local (ex. după un buton de status).
export function useApiData(path) {
  const [state, setState] = useState({ data: null, error: '', loading: true })
  const [version, setVersion] = useState(0)

  useEffect(() => {
    let active = true
    apiFetch(path)
      .then((data) => {
        if (active) setState({ data, error: '', loading: false })
      })
      .catch((err) => {
        if (active) setState({ data: null, error: err.message, loading: false })
      })
    // Răspunsul unei cereri vechi (ex. pagina a fost închisă) e ignorat
    return () => {
      active = false
    }
  }, [path, version])

  const reload = useCallback(() => setVersion((value) => value + 1), [])

  const setData = useCallback((update) => {
    setState((current) => ({
      ...current,
      data: typeof update === 'function' ? update(current.data) : update,
    }))
  }, [])

  return { ...state, reload, setData }
}
