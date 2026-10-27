import { useEffect, useId, useRef, useState } from 'react'
import { CaretUpDown } from '@phosphor-icons/react/CaretUpDown'
import { Check } from '@phosphor-icons/react/Check'
import { cn } from '../cn'
import { controlClasses, requiredMark } from '../formStyles'
import { FieldError } from './FormField'

// Inițialele pentru cercul din fața numelui: „Ana Ciobanu” -> „AC”
const initials = (text) =>
  text
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('')

function Avatar({ label }) {
  return (
    <span
      aria-hidden="true"
      className="flex size-7 shrink-0 items-center justify-center rounded-full bg-mint-200 text-[11px] font-bold text-ink-800"
    >
      {initials(label)}
    </span>
  )
}

// Listă de alegere desenată de noi (în locul <select>), după modelul WAI-ARIA „listbox”:
// butonul deschide lista; săgeți / Home / End mută selecția, Enter alege, Escape închide.
// options = [{ value, label }]; value = valoarea aleasă ('' = nimic ales)
export default function Listbox({
  id,
  label,
  value,
  options,
  onChange,
  placeholder = 'Alege…',
  error,
  required = false,
  disabled = false,
  avatars = false,
  className,
}) {
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const wrapperRef = useRef(null)
  const buttonRef = useRef(null)
  const listRef = useRef(null)
  const listId = useId()
  const labelId = `${id}-label`
  const errorId = error ? `${id}-error` : undefined

  const selected = options.find((option) => String(option.value) === String(value))

  // Închide la clic în afara listei
  useEffect(() => {
    if (!open) return
    const onClick = (event) => {
      if (!wrapperRef.current?.contains(event.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open])

  // La deschidere, lista primește focusul (pentru tastatură)
  useEffect(() => {
    if (open) listRef.current?.focus()
  }, [open])

  // Opțiunea activă (aleasă cu săgețile) rămâne vizibilă când lista e mai lungă decât fereastra ei
  useEffect(() => {
    if (open && activeIndex >= 0) {
      document.getElementById(`${listId}-${activeIndex}`)?.scrollIntoView?.({ block: 'nearest' })
    }
  }, [open, activeIndex, listId])

  function openList() {
    if (disabled || options.length === 0) return
    const index = options.findIndex((option) => String(option.value) === String(value))
    setActiveIndex(index >= 0 ? index : 0)
    setOpen(true)
  }

  function close() {
    setOpen(false)
    buttonRef.current?.focus()
  }

  function choose(option) {
    onChange(String(option.value))
    close()
  }

  function onButtonKeyDown(event) {
    if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(event.key)) {
      event.preventDefault()
      openList()
    }
  }

  function onListKeyDown(event) {
    const last = options.length - 1
    const moves = {
      ArrowDown: () => setActiveIndex((index) => Math.min(last, index + 1)),
      ArrowUp: () => setActiveIndex((index) => Math.max(0, index - 1)),
      Home: () => setActiveIndex(0),
      End: () => setActiveIndex(last),
    }
    if (moves[event.key]) {
      event.preventDefault()
      moves[event.key]()
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      if (options[activeIndex]) choose(options[activeIndex])
    } else if (event.key === 'Escape') {
      event.preventDefault()
      close()
    } else if (event.key === 'Tab') {
      setOpen(false)
    }
  }

  return (
    <div ref={wrapperRef} className={cn('relative flex flex-col gap-2', className)}>
      <span id={labelId} className={cn('text-sm font-medium text-ink-700', required && requiredMark)}>
        {label}
      </span>

      <button
        ref={buttonRef}
        id={id}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-labelledby={`${labelId} ${id}`}
        aria-invalid={Boolean(error)}
        aria-required={required || undefined}
        aria-describedby={errorId}
        onClick={() => (open ? setOpen(false) : openList())}
        onKeyDown={onButtonKeyDown}
        className={cn(
          controlClasses,
          'flex items-center gap-3 py-2 text-left disabled:cursor-not-allowed disabled:bg-ink-50',
          open && 'ring-2 ring-mint-500',
        )}
      >
        {selected ? (
          <>
            {avatars && <Avatar label={selected.label} />}
            <span className="truncate">{selected.label}</span>
          </>
        ) : (
          <span className="truncate text-ink-500">{placeholder}</span>
        )}
        <CaretUpDown size={18} aria-hidden="true" className="ml-auto shrink-0 text-ink-500" />
      </button>

      {open && (
        <ul
          ref={listRef}
          id={listId}
          role="listbox"
          tabIndex={-1}
          aria-labelledby={labelId}
          aria-activedescendant={activeIndex >= 0 ? `${listId}-${activeIndex}` : undefined}
          onKeyDown={onListKeyDown}
          className="absolute top-full right-0 left-0 z-20 mt-2 max-h-72 animate-pop-in overflow-y-auto rounded-xl bg-white p-1.5 shadow-popover ring-1 ring-ink-200/70 focus:outline-none"
        >
          {options.map((option, index) => {
            const isSelected = String(option.value) === String(value)
            return (
              <li
                key={option.value}
                id={`${listId}-${index}`}
                role="option"
                aria-selected={isSelected}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => choose(option)}
                className={cn(
                  'flex cursor-pointer items-center gap-3 rounded-lg px-2.5 py-2 text-[15px] text-ink-800',
                  index === activeIndex && 'bg-mint-50',
                  isSelected && 'font-medium text-ink-900',
                )}
              >
                {avatars && <Avatar label={option.label} />}
                <span className="flex-1 truncate">{option.label}</span>
                {isSelected && <Check size={18} weight="bold" aria-hidden="true" className="text-mint-600" />}
              </li>
            )
          })}
        </ul>
      )}

      {error && <FieldError id={errorId}>{error}</FieldError>}
    </div>
  )
}
