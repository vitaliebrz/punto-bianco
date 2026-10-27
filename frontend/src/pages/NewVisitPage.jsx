import { useEffect, useRef, useState } from 'react'
import { Bed } from '@phosphor-icons/react/Bed'
import { CalendarBlank } from '@phosphor-icons/react/CalendarBlank'
import { CircleNotch } from '@phosphor-icons/react/CircleNotch'
import { FloppyDisk } from '@phosphor-icons/react/FloppyDisk'
import { IdentificationBadge } from '@phosphor-icons/react/IdentificationBadge'
import { User } from '@phosphor-icons/react/User'
import { UsersThree } from '@phosphor-icons/react/UsersThree'
import { Van } from '@phosphor-icons/react/Van'
import { WarningCircle } from '@phosphor-icons/react/WarningCircle'
import { useNavigate } from 'react-router-dom'
import { apiFetch } from '../api'
import { useAuth } from '../auth/useAuth'
import Button from '../components/Button'
import FormField from '../components/FormField'
import FormSection, { Reveal } from '../components/FormSection'
import Listbox from '../components/Listbox'
import PageHeader from '../components/PageHeader'
import RadioCards from '../components/RadioCards'
import SegmentedControl from '../components/SegmentedControl'
import Switch from '../components/Switch'
import { APARTMENT_LABELS, TRANSFER_DIRECTION_LABELS } from '../labels'
import { useApiData } from '../useApiData'
import { buildVisitPayload, errorsByField, initialVisitForm } from '../visitForm'

// Câmpurile cunoscute de formular, în ordinea din pagină (după 400 se mută focusul pe primul greșit).
// O eroare pe alt câmp apare în mesajul de jos, lângă butoane.
const KNOWN_FIELDS = [
  'patient.firstName',
  'patient.lastName',
  'patient.treatment',
  'patient.availability',
  'companion.firstName',
  'companion.lastName',
  'companion.treatment',
  'companion.availability',
  'arrivalAt',
  'departureAt',
  'accommodation.apartmentType',
  'accommodation.freeDays',
  'transfer.direction',
  'coordinatorId',
]

const APARTMENT_OPTIONS = Object.entries(APARTMENT_LABELS).map(([value, label]) => ({ value, label }))
const DIRECTION_OPTIONS = Object.entries(TRANSFER_DIRECTION_LABELS).map(([value, label]) => ({ value, label }))
const COST_OPTIONS = [
  { value: 'free', label: 'Gratuit' },
  { value: 'paid', label: 'Contra cost' },
]

// Pasul 1 din cerință: coordonatorul înregistrează pacientul
export default function NewVisitPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const coordinators = useApiData('/api/users/coordinators')
  const [form, setForm] = useState(() => initialVisitForm(user))
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  // Primul câmp greșit după trimitere ({ name }: obiect nou la fiecare trimitere, ca efectul să ruleze iar)
  const [firstInvalid, setFirstInvalid] = useState(null)
  const formRef = useRef(null)

  // Pe telefon eroarea poate fi mult mai sus de buton: derulăm la primul câmp greșit și îl selectăm
  useEffect(() => {
    if (!firstInvalid) return
    const form = formRef.current
    const field =
      form?.querySelector(`[id="${firstInvalid.name}"]`) ?? form?.querySelector(`[name="${firstInvalid.name}"]`)
    field?.scrollIntoView?.({ block: 'center' })
    field?.focus({ preventScroll: true })
  }, [firstInvalid])

  // Eroarea unui câmp dispare când e modificat
  const clearError = (name) =>
    setErrors((current) => {
      if (!(name in current)) return current
      const next = { ...current }
      delete next[name]
      return next
    })

  // setField('arrivalAt', valoare) / setSectionField('patient', 'firstName', valoare)
  const setField = (name, value) => {
    setForm((current) => ({ ...current, [name]: value }))
    clearError(name)
  }
  const setSectionField = (section, key, value) => {
    setForm((current) => ({ ...current, [section]: { ...current[section], [key]: value } }))
    clearError(`${section}.${key}`)
  }

  // Proprietățile comune ale unui câmp text dintr-o secțiune
  const text = (section, key) => ({
    id: `${section}.${key}`,
    value: form[section][key],
    error: errors[`${section}.${key}`],
    onChange: (event) => setSectionField(section, key, event.target.value),
  })

  async function handleSubmit(event) {
    event.preventDefault()
    setSubmitting(true)
    setErrors({})
    setFormError('')

    try {
      const visit = await apiFetch('/api/visits', { method: 'POST', body: buildVisitPayload(form) })
      navigate(`/vizite/${visit.id}`, { state: { created: true } })
    } catch (err) {
      const fieldErrors = errorsByField(err.details)
      setErrors(fieldErrors)
      const invalidFields = KNOWN_FIELDS.filter((field) => fieldErrors[field])
      // Erorile pe câmpuri pe care formularul nu le are nu se pot arăta lângă câmp: le arătăm jos
      const otherMessages = Object.entries(fieldErrors)
        .filter(([field]) => !KNOWN_FIELDS.includes(field))
        .map(([, message]) => message)
      const messages = [invalidFields.length > 0 && 'Verifică câmpurile marcate cu roșu.', ...otherMessages]
      setFormError(messages.filter(Boolean).join(' ') || err.message)
      if (invalidFields.length > 0) setFirstInvalid({ name: invalidFields[0] })
      setSubmitting(false)
    }
  }

  return (
    <section className="flex flex-col gap-6">
      <PageHeader
        title="Vizită nouă"
        description="După salvare, Back office-ul și managerul de cazări sunt anunțați automat."
      />

      <form ref={formRef} className="flex max-w-3xl flex-col gap-5" onSubmit={handleSubmit} noValidate>
        <p className="text-sm text-ink-500">
          Câmpurile marcate cu <span className="font-bold text-red-600">*</span> sunt obligatorii.
        </p>

        <FormSection number={1} icon={User} title="Pacient">
          <div className="grid gap-5 sm:grid-cols-2">
            <FormField label="Prenume" required autoComplete="off" {...text('patient', 'firstName')} />
            <FormField label="Nume" required autoComplete="off" {...text('patient', 'lastName')} />
          </div>
          <FormField label="Tratament" required as="textarea" rows={3} {...text('patient', 'treatment')} />
          <FormField
            label="Disponibilitatea în perioada sejurului"
            as="textarea"
            rows={2}
            hint="Comentariu, ex. „liber după ora 12:00”"
            {...text('patient', 'availability')}
          />
        </FormSection>

        <FormSection number={2} icon={UsersThree} title="Însoțitor">
          <Switch
            id="hasCompanion"
            label="Vine cu însoțitor"
            checked={form.hasCompanion}
            onChange={(event) => setField('hasCompanion', event.target.checked)}
          />

          {form.hasCompanion && (
            <Reveal>
              <div className="grid gap-5 sm:grid-cols-2">
                <FormField label="Prenume însoțitor" required autoComplete="off" {...text('companion', 'firstName')} />
                <FormField label="Nume însoțitor" required autoComplete="off" {...text('companion', 'lastName')} />
              </div>
              <Switch
                id="companionHasTreatment"
                label="Însoțitorul are și el tratament"
                description="Se completează aceleași câmpuri ca la pacient."
                checked={form.companionHasTreatment}
                onChange={(event) => setField('companionHasTreatment', event.target.checked)}
              />
              {form.companionHasTreatment && (
                <>
                  <FormField label="Tratament însoțitor" required as="textarea" rows={3} {...text('companion', 'treatment')} />
                  <FormField
                    label="Disponibilitatea însoțitorului"
                    as="textarea"
                    rows={2}
                    {...text('companion', 'availability')}
                  />
                </>
              )}
            </Reveal>
          )}
        </FormSection>

        <FormSection number={3} icon={CalendarBlank} title="Sejur">
          <div className="grid gap-5 sm:grid-cols-2">
            <FormField
              id="arrivalAt"
              label="Sosire (data și ora)"
              required
              type="datetime-local"
              value={form.arrivalAt}
              error={errors.arrivalAt}
              onChange={(event) => setField('arrivalAt', event.target.value)}
            />
            <FormField
              id="departureAt"
              label="Plecare (data și ora)"
              required
              type="datetime-local"
              value={form.departureAt}
              error={errors.departureAt}
              onChange={(event) => setField('departureAt', event.target.value)}
            />
          </div>
        </FormSection>

        <FormSection number={4} icon={Bed} title="Cazare">
          <Switch
            id="needsAccommodation"
            label="Are nevoie de cazare"
            checked={form.needsAccommodation}
            onChange={(event) => setField('needsAccommodation', event.target.checked)}
          />

          {form.needsAccommodation && (
            <Reveal>
              <RadioCards
                name="accommodation.apartmentType"
                label="Tipul apartamentului"
                required
                options={APARTMENT_OPTIONS}
                value={form.accommodation.apartmentType}
                error={errors['accommodation.apartmentType'] && 'Alege tipul apartamentului'}
                onChange={(value) => setSectionField('accommodation', 'apartmentType', value)}
              />
              <Switch
                id="accommodationIsFree"
                label="Cazare gratuită"
                checked={form.accommodation.isFree}
                onChange={(event) => setSectionField('accommodation', 'isFree', event.target.checked)}
              />
              {form.accommodation.isFree && (
                <FormField
                  label="Pentru câte zile e gratuită"
                  required
                  type="number"
                  min="1"
                  max="365"
                  inputMode="numeric"
                  className="sm:max-w-56"
                  {...text('accommodation', 'freeDays')}
                />
              )}
            </Reveal>
          )}
        </FormSection>

        <FormSection number={5} icon={Van} title="Transfer de la aeroport">
          <Switch
            id="needsTransfer"
            label="Are nevoie de transfer"
            checked={form.needsTransfer}
            onChange={(event) => setField('needsTransfer', event.target.checked)}
          />

          {form.needsTransfer && (
            <Reveal>
              <SegmentedControl
                name="transferCost"
                label="Cost"
                options={COST_OPTIONS}
                value={form.transfer.isFree ? 'free' : 'paid'}
                onChange={(value) => setSectionField('transfer', 'isFree', value === 'free')}
              />
              <SegmentedControl
                name="transfer.direction"
                label="Direcția"
                required
                options={DIRECTION_OPTIONS}
                value={form.transfer.direction}
                error={errors['transfer.direction'] && 'Alege direcția transferului'}
                onChange={(value) => setSectionField('transfer', 'direction', value)}
              />
            </Reveal>
          )}
        </FormSection>

        <FormSection number={6} icon={IdentificationBadge} title="Coordonator responsabil">
          <Listbox
            id="coordinatorId"
            label="Coordonator"
            required
            avatars
            className="sm:max-w-sm"
            placeholder={coordinators.loading ? 'Se încarcă…' : 'Alege coordonatorul'}
            disabled={coordinators.loading}
            options={(coordinators.data ?? []).map((coordinator) => ({
              value: coordinator.id,
              label: coordinator.fullName,
            }))}
            value={form.coordinatorId}
            error={errors.coordinatorId ?? coordinators.error}
            onChange={(value) => setField('coordinatorId', value)}
          />
        </FormSection>

        {/* Telefon / tabletă: butoanele stau la final, sub formular (lipite jos, ar sta deasupra tastaturii
            și ar acoperi câmpurile). Calculator (ecran lat + mouse): rămân lipite jos, ca să nu derulezi până la capăt. */}
        <div className="mt-1 flex flex-col gap-3 lg:rounded-2xl lg:border lg:border-ink-200/70 lg:bg-white/90 lg:px-5 lg:py-4 lg:shadow-card lg:backdrop-blur-md lg:pointer-fine:sticky lg:pointer-fine:bottom-0 lg:pointer-fine:z-10">
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
            <Button variant="secondary" disabled={submitting} onClick={() => navigate('/vizite')}>
              Renunță
            </Button>
            <Button type="submit" disabled={submitting} className="sm:min-w-52">
              {submitting ? (
                <>
                  <CircleNotch size={18} weight="bold" aria-hidden="true" className="animate-spin" />
                  Se salvează…
                </>
              ) : (
                <>
                  <FloppyDisk size={18} weight="bold" aria-hidden="true" />
                  Înregistrează vizita
                </>
              )}
            </Button>
          </div>
        </div>
      </form>
    </section>
  )
}
