import { useState } from 'react'
import { CircleNotch } from '@phosphor-icons/react/CircleNotch'
import { EnvelopeSimple } from '@phosphor-icons/react/EnvelopeSimple'
import { LockSimple } from '@phosphor-icons/react/LockSimple'
import { SignIn } from '@phosphor-icons/react/SignIn'
import { WarningCircle } from '@phosphor-icons/react/WarningCircle'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { cn } from '../cn'
import Button from '../components/Button'
import { WithAction } from '../components/FormField'
import Logo from '../components/Logo'
import PasswordToggle from '../components/PasswordToggle'
import { controlClasses } from '../formStyles'

// Câmp cu iconiță în stânga (email, parolă); `action` = un buton în dreapta câmpului
function IconInput({ id, label, icon: Icon, action, ...props }) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-sm font-medium text-ink-700">
        {label}
      </label>
      <div className="relative">
        <Icon
          size={18}
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-ink-400"
        />
        {action ? (
          <WithAction action={action}>
            <input id={id} className={cn(controlClasses, 'h-12 pr-12 pl-10')} {...props} />
          </WithAction>
        ) : (
          <input id={id} className={cn(controlClasses, 'h-12 pl-10')} {...props} />
        )}
      </div>
    </div>
  )
}

export default function LoginPage() {
  const { user, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Pagina cerută înainte de login (dacă a fost redirecționat aici)
  const redirectTo = location.state?.from?.pathname || '/'

  if (user) {
    return <Navigate to={redirectTo} replace />
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await login(email, password)
      navigate(redirectTo, { replace: true })
    } catch (err) {
      setError(err.message)
      setSubmitting(false)
    }
  }

  return (
    <main className="grid min-h-dvh bg-white lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      {/* Calculator: panoul brandului, cu logo-ul original (alb, făcut pentru fundal închis) */}
      <section className="relative hidden flex-col items-center justify-center overflow-hidden bg-ink-600 px-12 lg:flex">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_38%,rgb(152_211_195/0.22),transparent_58%)]"
        />
        <div className="relative flex flex-col items-center gap-8 text-center">
          <Logo layout="stack" markClassName="size-40 bg-white" wordmarkClassName="h-8 text-white" />
          <p className="max-w-xs text-[15px] leading-relaxed text-ink-200">
            Organizarea vizitei fiecărui pacient: tratament, transfer de la aeroport și cazare.
          </p>
        </div>
      </section>

      {/* Formularul */}
      <section className="flex items-center justify-center px-5 py-10 sm:px-8">
        <div className="w-full max-w-sm">
          {/* Telefon: logo-ul deasupra formularului */}
          <div className="mb-10 lg:hidden">
            <Logo />
          </div>

          <h1 className="text-2xl font-extrabold tracking-tight text-ink-800">Conectează-te la contul tău</h1>
          <p className="mt-2 text-[15px] text-ink-500">Folosește adresa de email și parola primite de la clinică.</p>

          <form className="mt-8 flex flex-col gap-5" onSubmit={handleSubmit}>
            <IconInput
              id="email"
              label="Email"
              icon={EnvelopeSimple}
              type="email"
              autoComplete="username"
              placeholder="nume@puntobianco.demo"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
            />

            <IconInput
              id="password"
              label="Parolă"
              icon={LockSimple}
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              action={
                <PasswordToggle
                  controls="password"
                  shown={showPassword}
                  onToggle={() => setShowPassword((value) => !value)}
                />
              }
            />

            {error && (
              <p
                role="alert"
                className="flex items-start gap-2 rounded-xl bg-red-50 px-3.5 py-3 text-sm font-medium text-red-800 ring-1 ring-red-100 ring-inset"
              >
                <WarningCircle size={18} weight="bold" aria-hidden="true" className="mt-px shrink-0" />
                {error}
              </p>
            )}

            <Button type="submit" className="mt-1 h-12 w-full" disabled={submitting}>
              {submitting ? (
                <>
                  <CircleNotch size={18} weight="bold" aria-hidden="true" className="animate-spin" />
                  Se conectează…
                </>
              ) : (
                <>
                  Intră în cont
                  <SignIn size={18} weight="bold" aria-hidden="true" />
                </>
              )}
            </Button>
          </form>
        </div>
      </section>
    </main>
  )
}
