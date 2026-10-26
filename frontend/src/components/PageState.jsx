// Stările comune ale unei pagini care încarcă date: „Se încarcă…” sau eroare cu „Reîncearcă”.
// Returnează null când datele sunt gata, iar pagina își afișează conținutul.
export default function PageState({ loading, error, onRetry }) {
  if (loading) {
    return <p className="page-status">Se încarcă…</p>
  }
  if (error) {
    return (
      <div className="page-status">
        <p role="alert">{error}</p>
        <button type="button" className="btn btn-primary" onClick={onRetry}>
          Reîncearcă
        </button>
      </div>
    )
  }
  return null
}
