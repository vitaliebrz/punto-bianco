// Un câmp de formular cu etichetă și mesaj de eroare sub el.
// as="textarea" | "select" | "input" (implicit); restul proprietăților ajung la câmp.
export default function FormField({ id, label, error, hint, as = 'input', children, ...props }) {
  const Control = as
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined

  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <Control id={id} aria-invalid={Boolean(error)} aria-describedby={describedBy} {...props}>
        {children}
      </Control>
      {hint && !error && (
        <span id={`${id}-hint`} className="field-hint">
          {hint}
        </span>
      )}
      {error && (
        <span id={`${id}-error`} className="field-error">
          {error}
        </span>
      )}
    </div>
  )
}
