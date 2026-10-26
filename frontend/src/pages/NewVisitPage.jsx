import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiFetch } from '../api'
import { useAuth } from '../auth/useAuth'
import FormField from '../components/FormField'
import { APARTMENT_LABELS, TRANSFER_DIRECTION_LABELS } from '../labels'
import { useApiData } from '../useApiData'
import { buildVisitPayload, errorsByField, initialVisitForm } from '../visitForm'

// Câmpurile cunoscute de formular; o eroare pe alt câmp apare în mesajul de sus
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
  'coordinatorId',
  'accommodation.apartmentType',
  'accommodation.freeDays',
  'transfer.direction',
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

  // setField('arrivalAt', valoare) / setSectionField('patient', 'firstName', valoare)
  const setField = (name, value) => setForm((current) => ({ ...current, [name]: value }))
  const setSectionField = (section, key, value) =>
    setForm((current) => ({ ...current, [section]: { ...current[section], [key]: value } }))

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
      const hasUnknown = Object.keys(fieldErrors).some((field) => !KNOWN_FIELDS.includes(field))
      setFormError(
        err.details && !hasUnknown ? 'Verifică câmpurile marcate cu roșu.' : err.message,
      )
      setSubmitting(false)
    }
  }

  return (
    <section className="page">
      <div className="page-header">
        <h1>Vizită nouă</h1>
      </div>

      <form className="visit-form" onSubmit={handleSubmit} noValidate>
        <fieldset className="form-section">
          <legend>Pacient</legend>
          <div className="form-grid">
            <FormField label="Prenume" autoComplete="off" {...text('patient', 'firstName')} />
            <FormField label="Nume" autoComplete="off" {...text('patient', 'lastName')} />
          </div>
          <FormField label="Tratament" as="textarea" rows={3} {...text('patient', 'treatment')} />
          <FormField
            label="Disponibilitatea în perioada sejurului"
            as="textarea"
            rows={2}
            hint="Comentariu, ex. „liber după ora 12:00”"
            {...text('patient', 'availability')}
          />
        </fieldset>

        <fieldset className="form-section">
          <legend>Însoțitor</legend>
          <label className="check">
            <input
              type="checkbox"
              checked={form.hasCompanion}
              onChange={(event) => setField('hasCompanion', event.target.checked)}
            />
            Vine cu însoțitor
          </label>

          {form.hasCompanion && (
            <>
              <div className="form-grid">
                <FormField label="Prenume însoțitor" autoComplete="off" {...text('companion', 'firstName')} />
                <FormField label="Nume însoțitor" autoComplete="off" {...text('companion', 'lastName')} />
              </div>
              <label className="check">
                <input
                  type="checkbox"
                  checked={form.companionHasTreatment}
                  onChange={(event) => setField('companionHasTreatment', event.target.checked)}
                />
                Însoțitorul are și el tratament
              </label>
              {form.companionHasTreatment && (
                <>
                  <FormField
                    label="Tratament însoțitor"
                    as="textarea"
                    rows={3}
                    {...text('companion', 'treatment')}
                  />
                  <FormField
                    label="Disponibilitatea însoțitorului"
                    as="textarea"
                    rows={2}
                    {...text('companion', 'availability')}
                  />
                </>
              )}
            </>
          )}
        </fieldset>

        <fieldset className="form-section">
          <legend>Sejur</legend>
          <div className="form-grid">
            <FormField
              id="arrivalAt"
              label="Sosire (data și ora)"
              type="datetime-local"
              value={form.arrivalAt}
              error={errors.arrivalAt}
              onChange={(event) => setField('arrivalAt', event.target.value)}
            />
            <FormField
              id="departureAt"
              label="Plecare (data și ora)"
              type="datetime-local"
              value={form.departureAt}
              error={errors.departureAt}
              onChange={(event) => setField('departureAt', event.target.value)}
            />
          </div>
        </fieldset>

        <fieldset className="form-section">
          <legend>Cazare</legend>
          <label className="check">
            <input
              type="checkbox"
              checked={form.needsAccommodation}
              onChange={(event) => setField('needsAccommodation', event.target.checked)}
            />
            Are nevoie de cazare
          </label>

          {form.needsAccommodation && (
            <>
              <FormField as="select" label="Tipul apartamentului" {...text('accommodation', 'apartmentType')}>
                <option value="">Alege…</option>
                {Object.entries(APARTMENT_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </FormField>
              <label className="check">
                <input
                  type="checkbox"
                  checked={form.accommodation.isFree}
                  onChange={(event) => setSectionField('accommodation', 'isFree', event.target.checked)}
                />
                Cazare gratuită
              </label>
              {form.accommodation.isFree && (
                <FormField
                  label="Pentru câte zile e gratuită"
                  type="number"
                  min="1"
                  max="365"
                  inputMode="numeric"
                  {...text('accommodation', 'freeDays')}
                />
              )}
            </>
          )}
        </fieldset>

        <fieldset className="form-section">
          <legend>Transfer de la aeroport</legend>
          <label className="check">
            <input
              type="checkbox"
              checked={form.needsTransfer}
              onChange={(event) => setField('needsTransfer', event.target.checked)}
            />
            Are nevoie de transfer
          </label>

          {form.needsTransfer && (
            <>
              <div className="radio-group" role="radiogroup" aria-label="Cost transfer">
                <label className="check">
                  <input
                    type="radio"
                    name="transferCost"
                    checked={form.transfer.isFree}
                    onChange={() => setSectionField('transfer', 'isFree', true)}
                  />
                  Gratuit
                </label>
                <label className="check">
                  <input
                    type="radio"
                    name="transferCost"
                    checked={!form.transfer.isFree}
                    onChange={() => setSectionField('transfer', 'isFree', false)}
                  />
                  Contra cost
                </label>
              </div>

              <div
                className="radio-group"
                role="radiogroup"
                aria-label="Direcția transferului"
                aria-describedby={errors['transfer.direction'] ? 'transfer.direction-error' : undefined}
              >
                {Object.entries(TRANSFER_DIRECTION_LABELS).map(([value, label]) => (
                  <label key={value} className="check">
                    <input
                      type="radio"
                      name="transferDirection"
                      value={value}
                      checked={form.transfer.direction === value}
                      onChange={() => setSectionField('transfer', 'direction', value)}
                    />
                    {label}
                  </label>
                ))}
              </div>
              {errors['transfer.direction'] && (
                <span id="transfer.direction-error" className="field-error">
                  Alege direcția transferului
                </span>
              )}
            </>
          )}
        </fieldset>

        <fieldset className="form-section">
          <legend>Coordonator responsabil</legend>
          <FormField
            as="select"
            id="coordinatorId"
            label="Coordonator"
            value={form.coordinatorId}
            error={errors.coordinatorId ?? coordinators.error}
            onChange={(event) => setField('coordinatorId', event.target.value)}
          >
            <option value="">{coordinators.loading ? 'Se încarcă…' : 'Alege…'}</option>
            {(coordinators.data ?? []).map((coordinator) => (
              <option key={coordinator.id} value={coordinator.id}>
                {coordinator.fullName}
              </option>
            ))}
          </FormField>
        </fieldset>

        {formError && (
          <p className="alert-error" role="alert">
            {formError}
          </p>
        )}

        <div className="form-actions">
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? 'Se salvează…' : 'Înregistrează vizita'}
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => navigate('/vizite')}>
            Renunță
          </button>
        </div>
      </form>
    </section>
  )
}
