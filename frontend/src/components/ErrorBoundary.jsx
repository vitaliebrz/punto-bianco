import { Component } from 'react'

// Dacă o pagină dă o eroare neașteptată la afișare, React ar lăsa ecranul complet alb.
// În schimb arătăm un mesaj și un buton de reîncărcare (componentele de tip „error boundary”
// trebuie să fie clase: React nu are încă un hook pentru asta).
export default class ErrorBoundary extends Component {
  state = { error: null }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('Eroare la afișare:', error, info.componentStack)
  }

  render() {
    if (!this.state.error) return this.props.children

    return (
      <div className="flex min-h-dvh items-center justify-center bg-ink-50 px-4">
        <div role="alert" className="flex w-full max-w-md flex-col gap-4 rounded-2xl bg-white p-6 shadow-card ring-1 ring-ink-200/60">
          <p className="text-lg font-extrabold text-ink-900">Ceva nu a mers bine</p>
          <p className="text-[15px] text-ink-600">
            Pagina nu a putut fi afișată. Reîncarcă pagina; dacă problema rămâne, anunță echipa tehnică.
          </p>
          <p className="rounded-lg bg-ink-50 px-3 py-2 font-mono text-xs break-words text-ink-500">
            {String(this.state.error?.message ?? this.state.error)}
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="inline-flex h-11 items-center justify-center rounded-xl bg-mint-300 px-5 text-[15px] font-medium text-ink-900 hover:bg-mint-400 focus-visible:ring-2 focus-visible:ring-mint-500 focus-visible:ring-offset-2 focus-visible:outline-none"
          >
            Reîncarcă pagina
          </button>
        </div>
      </div>
    )
  }
}
