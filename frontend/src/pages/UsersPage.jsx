import { useState } from 'react'
import { CheckCircle } from '@phosphor-icons/react/CheckCircle'
import { CircleNotch } from '@phosphor-icons/react/CircleNotch'
import { EnvelopeSimple } from '@phosphor-icons/react/EnvelopeSimple'
import { IdentificationBadge } from '@phosphor-icons/react/IdentificationBadge'
import { UserCheck } from '@phosphor-icons/react/UserCheck'
import { UserMinus } from '@phosphor-icons/react/UserMinus'
import { UserPlus } from '@phosphor-icons/react/UserPlus'
import { Users } from '@phosphor-icons/react/Users'
import { WarningCircle } from '@phosphor-icons/react/WarningCircle'
import { apiFetch } from '../api'
import { useAuth } from '../auth/useAuth'
import Button from '../components/Button'
import EmptyState from '../components/EmptyState'
import FormField from '../components/FormField'
import Listbox from '../components/Listbox'
import Meta from '../components/Meta'
import PageHeader from '../components/PageHeader'
import PageState, { ErrorState } from '../components/PageState'
import Panel from '../components/Panel'
import PasswordToggle from '../components/PasswordToggle'
import StatusBadge from '../components/StatusBadge'
import { ROLE_LABELS } from '../roles'
import { useApiData } from '../useApiData'
import { errorsByField } from '../visitForm'

const EMPTY_FORM = { fullName: '', email: '', role: '', password: '' }
const FORM_FIELDS = Object.keys(EMPTY_FORM)
const ROLE_OPTIONS = Object.entries(ROLE_LABELS).map(([value, label]) => ({ value, label }))

// Admin: lista utilizatorilor, cont nou, dezactivare / reactivare (fără ștergere: vizitele păstrează
// coordonatorul și autorul). Un cont dezactivat pierde accesul imediat, chiar dacă e conectat.
export default function UsersPage() {
  const { user: me } = useAuth()
  const { data: users, error, loading, retryable, reload, setData } = useApiData('/api/users')

  const [formOpen, setFormOpen] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [created, setCreated] = useState(null)

  // Conturile care se salvează acum: fiecare rând își blochează butonul separat (ca la Back office)
  const [busyIds, setBusyIds] = useState(() => new Set())
  const [actionError, setActionError] = useState('')

  // Proprietățile comune ale unui câmp; eroarea lui dispare când e modificat
  const field = (name) => ({
    id: `user-${name}`,
    value: form[name],
    error: errors[name],
    onChange: (event) => setField(name, event.target.value),
  })

  function setField(name, value) {
    setForm((current) => ({ ...current, [name]: value }))
    setErrors((current) => {
      if (!(name in current)) return current
      const next = { ...current }
      delete next[name]
      return next
    })
  }

  function openForm() {
    setCreated(null)
    setFormOpen(true)
  }

  function closeForm() {
    setFormOpen(false)
    setForm(EMPTY_FORM)
    setErrors({})
    setFormError('')
    setShowPassword(false)
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setSubmitting(true)
    setErrors({})
    setFormError('')
    try {
      const user = await apiFetch('/api/users', { method: 'POST', body: form })
      closeForm()
      setCreated(user)
      reload() // lista, în ordinea de la server (lista veche rămâne pe ecran până vine cea nouă)
    } catch (err) {
      const fieldErrors = errorsByField(err.details)
      setErrors(fieldErrors)
      const known = FORM_FIELDS.some((name) => fieldErrors[name])
      setFormError(known ? 'Verifică câmpurile marcate cu roșu.' : err.message)
    } finally {
      setSubmitting(false)
    }
  }

  async function setActive(user, active) {
    const question = `Dezactivezi contul lui ${user.fullName}? Nu va mai putea intra în aplicație.`
    if (!active && !window.confirm(question)) return

    setBusyIds((ids) => new Set(ids).add(user.id))
    setActionError('')
    try {
      const updated = await apiFetch(`/api/users/${user.id}/active`, { method: 'PATCH', body: { active } })
      setData((list) => list.map((item) => (item.id === updated.id ? updated : item)))
    } catch (err) {
      setActionError(err.message)
    } finally {
      setBusyIds((ids) => {
        const next = new Set(ids)
        next.delete(user.id)
        return next
      })
    }
  }

  return (
    <section className="flex flex-col gap-6">
      <PageHeader
        title="Utilizatori"
        description="Conturile echipei. Un cont dezactivat nu mai poate intra în aplicație."
        actions={
          !formOpen && (
            <Button icon={UserPlus} onClick={openForm}>
              Utilizator nou
            </Button>
          )
        }
      />

      {created && (
        <p
          role="status"
          className="flex items-start gap-2.5 rounded-xl bg-mint-100 px-4 py-3 text-[15px] font-medium text-mint-900 ring-1 ring-mint-200 ring-inset"
        >
          <CheckCircle size={20} weight="fill" aria-hidden="true" className="mt-px shrink-0 text-mint-600" />
          Contul lui {created.fullName} a fost creat. Comunică-i colegului emailul ({created.email}) și parola.
        </p>
      )}

      {formOpen && (
        <Panel icon={UserPlus} title="Utilizator nou" className="max-w-3xl">
          <form className="flex flex-col gap-5" onSubmit={handleSubmit} noValidate>
            <div className="grid gap-5 sm:grid-cols-2">
              <FormField label="Nume complet" required autoComplete="off" {...field('fullName')} />
              <FormField label="Email" required type="email" autoComplete="off" {...field('email')} />
              <Listbox
                id="user-role"
                label="Rol"
                required
                placeholder="Alege rolul"
                options={ROLE_OPTIONS}
                value={form.role}
                error={errors.role}
                onChange={(value) => setField('role', value)}
              />
              <FormField
                label="Parolă inițială"
                required
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                hint="Minim 8 caractere. Comunică-i-o colegului."
                action={
                  <PasswordToggle
                    controls="user-password"
                    shown={showPassword}
                    onToggle={() => setShowPassword((value) => !value)}
                  />
                }
                {...field('password')}
              />
            </div>

            {formError && (
              <p
                role="alert"
                className="flex items-start gap-2 rounded-xl bg-red-50 px-3.5 py-3 text-sm font-medium text-red-800 ring-1 ring-red-100 ring-inset"
              >
                <WarningCircle size={18} weight="bold" aria-hidden="true" className="mt-px shrink-0" />
                {formError}
              </p>
            )}

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Button variant="secondary" disabled={submitting} onClick={closeForm}>
                Renunță
              </Button>
              <Button type="submit" disabled={submitting} className="sm:min-w-48">
                {submitting ? (
                  <>
                    <CircleNotch size={18} weight="bold" aria-hidden="true" className="animate-spin" />
                    Se salvează…
                  </>
                ) : (
                  <>
                    <UserPlus size={18} weight="bold" aria-hidden="true" />
                    Creează contul
                  </>
                )}
              </Button>
            </div>
          </form>
        </Panel>
      )}

      {actionError && <ErrorState message={actionError} />}

      <PageState loading={loading} error={error} onRetry={retryable ? reload : undefined} />

      {users && users.length === 0 && <EmptyState icon={Users} title="Nu există utilizatori." />}

      {users && users.length > 0 && (
        <ul aria-label="Lista utilizatorilor" className="flex flex-col gap-3">
          {users.map((user) => {
            const isMe = user.id === me.id
            const busy = busyIds.has(user.id)
            return (
              <li
                key={user.id}
                data-active={user.active}
                className="flex flex-col gap-4 rounded-2xl bg-white p-5 shadow-card ring-1 ring-ink-200/60 md:flex-row md:items-center md:gap-6"
              >
                <div className="flex min-w-0 flex-1 flex-col gap-2">
                  <p className="text-[17px] font-bold text-ink-900">
                    {user.fullName}
                    {isMe && <span className="ml-2 text-sm font-medium text-ink-500">(tu)</span>}
                  </p>
                  <dl className="flex flex-wrap gap-x-6 gap-y-2">
                    <Meta icon={EnvelopeSimple} label="Email">
                      <span className="break-all">{user.email}</span>
                    </Meta>
                    <Meta icon={IdentificationBadge} label="Rol">
                      {ROLE_LABELS[user.role] ?? user.role}
                    </Meta>
                  </dl>
                </div>

                <div className="flex items-center justify-between gap-3 border-t border-ink-100 pt-4 md:w-64 md:shrink-0 md:justify-end md:border-t-0 md:pt-0">
                  <StatusBadge status={user.active ? 'ACTIV' : 'INACTIV'} />
                  {/* Propriul cont nu se poate dezactiva (aplicația ar rămâne fără Admin) */}
                  {!isMe && (
                    <Button
                      variant="secondary"
                      size="sm"
                      icon={busy ? undefined : user.active ? UserMinus : UserCheck}
                      disabled={busy}
                      // textul butonului e același pe fiecare rând: cititoarele de ecran află și al cui cont e
                      aria-label={busy ? undefined : `${user.active ? 'Dezactivează' : 'Reactivează'} contul lui ${user.fullName}`}
                      onClick={() => setActive(user, !user.active)}
                    >
                      {busy ? 'Se salvează…' : user.active ? 'Dezactivează' : 'Reactivează'}
                    </Button>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
