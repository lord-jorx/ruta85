import { useEffect, useId, useState } from 'react'
import type {
  ButtonHTMLAttributes,
  HTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
} from 'react'
import { Link } from 'react-router-dom'
import type { LinkProps } from 'react-router-dom'
import { cx, parseDecimal } from './format'
import { Icon } from './icons'
import type { IconName } from './icons'

/* ───────────────────────── Card ───────────────────────── */

interface CardProps extends Omit<HTMLAttributes<HTMLElement>, 'title'> {
  /** Etiqueta pequeña en mayúsculas arriba a la izquierda. */
  label?: ReactNode
  /** Contenido a la derecha de la etiqueta (enlace, botón…). */
  action?: ReactNode
  /** "board": textura de puntos de marcador. "accent": borde ámbar (lo de ahora). */
  tone?: 'plain' | 'board' | 'accent'
  as?: 'section' | 'div' | 'article'
}

export function Card({ label, action, tone = 'plain', as: Tag = 'section', className, children, ...rest }: CardProps) {
  return (
    <Tag className={cx('card', tone !== 'plain' && `card--${tone}`, className)} {...rest}>
      {(label || action) && (
        <header className="card__head">
          {label && <h2 className="eyebrow">{label}</h2>}
          {action && <div className="card__action">{action}</div>}
        </header>
      )}
      {children}
    </Tag>
  )
}

/* ───────────────────────── Stat ───────────────────────── */

export type StatStatus = 'ok' | 'warn' | 'crit'

const STATUS_ICON: Record<StatStatus, IconName> = { ok: 'ok', warn: 'warn', crit: 'crit' }

interface StatProps {
  /** Cifra ya formateada (p. ej. "84,6"). */
  value: ReactNode
  unit?: string
  label: string
  hint?: ReactNode
  status?: StatStatus
  /** Texto del estado: nunca solo color. Si falta, solo se muestra el icono con texto oculto. */
  statusText?: string
  size?: 'md' | 'lg'
  className?: string
}

export function Stat({ value, unit, label, hint, status, statusText, size = 'md', className }: StatProps) {
  return (
    <div className={cx('stat', `stat--${size}`, className)}>
      <div className="stat__label eyebrow">{label}</div>
      <div className="stat__value display">
        {value}
        {unit && <span className="stat__unit">{unit}</span>}
      </div>
      {hint && <div className="stat__hint">{hint}</div>}
      {status && (
        <div className={cx('stat__status', `stat__status--${status}`)}>
          <Icon name={STATUS_ICON[status]} size={16} />
          <span>{statusText ?? { ok: 'En objetivo', warn: 'Atención', crit: 'Alerta' }[status]}</span>
        </div>
      )}
    </div>
  )
}

/* ───────────────────────── Button ───────────────────────── */

interface ButtonBase {
  variant?: 'primary' | 'ghost' | 'danger'
  block?: boolean
  icon?: IconName
}

type ButtonProps = ButtonBase & ButtonHTMLAttributes<HTMLButtonElement>

function btnClass(variant: ButtonBase['variant'], block?: boolean, extra?: string) {
  return cx('btn', `btn--${variant ?? 'ghost'}`, block && 'btn--block', extra)
}

export function Button({ variant = 'ghost', block, icon, className, children, type = 'button', ...rest }: ButtonProps) {
  return (
    <button type={type} className={btnClass(variant, block, className)} {...rest}>
      {icon && <Icon name={icon} size={20} />}
      <span>{children}</span>
    </button>
  )
}

export function ButtonLink({
  variant = 'ghost',
  block,
  icon,
  className,
  children,
  ...rest
}: ButtonBase & LinkProps) {
  return (
    <Link className={btnClass(variant, block, className)} {...rest}>
      {icon && <Icon name={icon} size={20} />}
      <span>{children}</span>
    </Link>
  )
}

/* ───────────────────────── Campos ───────────────────────── */

interface NumberFieldProps {
  label: string
  value: number | null
  onChange: (value: number | null) => void
  unit?: string
  hint?: string
  min?: number
  max?: number
  /** Si se indica, muestra botones − / + de este paso (cómodo con el pulgar). */
  step?: number
  placeholder?: string
  id?: string
  autoFocus?: boolean
}

/** Campo numérico: teclado decimal, acepta coma o punto y no pierde lo que escribes. */
export function NumberField({
  label,
  value,
  onChange,
  unit,
  hint,
  min,
  max,
  step,
  placeholder,
  id,
  autoFocus,
}: NumberFieldProps) {
  const auto = useId()
  const fid = id ?? auto
  const [text, setText] = useState(value == null ? '' : String(value).replace('.', ','))
  const [lastValue, setLastValue] = useState(value)

  // Si el valor cambia desde fuera (no por lo que se teclea), se refleja en el texto.
  if (value !== lastValue) {
    setLastValue(value)
    if (value !== parseDecimal(text)) setText(value == null ? '' : String(value).replace('.', ','))
  }

  function commit(next: number | null) {
    if (next != null) {
      if (min != null && next < min) next = min
      if (max != null && next > max) next = max
    }
    setLastValue(next)
    onChange(next)
  }

  function bump(dir: 1 | -1) {
    const base = value ?? 0
    const next = Math.round((base + dir * (step ?? 1)) * 1000) / 1000
    const clamped = Math.min(max ?? Infinity, Math.max(min ?? -Infinity, next))
    setText(String(clamped).replace('.', ','))
    commit(clamped)
  }

  return (
    <div className="field">
      <label className="field__label eyebrow" htmlFor={fid}>
        {label}
      </label>
      <div className="field__control">
        {step != null && (
          <button type="button" className="field__step" aria-label={`Restar ${step} a ${label}`} onClick={() => bump(-1)}>
            <Icon name="minus" size={20} />
          </button>
        )}
        <input
          id={fid}
          className="field__input display"
          type="text"
          inputMode="decimal"
          step="any"
          autoComplete="off"
          enterKeyHint="done"
          pattern="[0-9]*[.,]?[0-9]*"
          placeholder={placeholder}
          autoFocus={autoFocus}
          value={text}
          aria-describedby={hint ? `${fid}-hint` : undefined}
          onChange={(e) => {
            const raw = e.target.value.replace(/[^0-9.,]/g, '')
            setText(raw)
            commit(parseDecimal(raw))
          }}
        />
        {unit && <span className="field__unit">{unit}</span>}
        {step != null && (
          <button type="button" className="field__step" aria-label={`Sumar ${step} a ${label}`} onClick={() => bump(1)}>
            <Icon name="plus" size={20} />
          </button>
        )}
      </div>
      {hint && (
        <p id={`${fid}-hint`} className="field__hint">
          {hint}
        </p>
      )}
    </div>
  )
}

interface TextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  label: string
  value: string
  onChange: (value: string) => void
  hint?: string
}

export function TextField({ label, value, onChange, hint, id, className, ...rest }: TextFieldProps) {
  const auto = useId()
  const fid = id ?? auto
  return (
    <div className="field">
      <label className="field__label eyebrow" htmlFor={fid}>
        {label}
      </label>
      <div className="field__control">
        <input
          id={fid}
          className={className ? `field__input field__input--text ${className}` : 'field__input field__input--text'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-describedby={hint ? `${fid}-hint` : undefined}
          {...rest}
        />
      </div>
      {hint && (
        <p id={`${fid}-hint`} className="field__hint">
          {hint}
        </p>
      )}
    </div>
  )
}

/* ───────────────────────── Segmented ───────────────────────── */

interface SegmentedProps<T extends string> {
  label: string
  options: ReadonlyArray<{ value: T; label: string }>
  value: T
  onChange: (value: T) => void
  hideLabel?: boolean
}

/** Selector de una opción (radios nativos: teclado y lectores de pantalla gratis). */
export function Segmented<T extends string>({ label, options, value, onChange, hideLabel }: SegmentedProps<T>) {
  const name = useId()
  return (
    <fieldset className="seg">
      <legend className={cx('eyebrow', hideLabel && 'sr-only')}>{label}</legend>
      <div className="seg__track">
        {options.map((o) => (
          <label key={o.value} className="seg__opt">
            <input
              type="radio"
              name={name}
              value={o.value}
              checked={o.value === value}
              onChange={() => onChange(o.value)}
            />
            <span>{o.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}

/* ───────────────────────── ScaleField (0-10) ───────────────────────── */

interface ScaleFieldProps {
  label: string
  value: number | null
  onChange: (value: number) => void
  max?: number
  /** A partir de este valor (exclusive) se marca como alerta. Rodilla: 3. */
  alertAbove?: number
  alertText?: string
}

/** Escala 0-10 con botones grandes. Por encima de `alertAbove` muestra alerta con icono y texto. */
export function ScaleField({ label, value, onChange, max = 10, alertAbove = 3, alertText }: ScaleFieldProps) {
  const name = useId()
  const alert = value != null && value > alertAbove
  return (
    <fieldset className="scale">
      <legend className="eyebrow">{label}</legend>
      <div className="scale__grid">
        {Array.from({ length: max + 1 }, (_, i) => (
          <label key={i} className={cx('scale__opt', i > alertAbove && 'scale__opt--hot')}>
            <input type="radio" name={name} value={i} checked={value === i} onChange={() => onChange(i)} />
            <span className="display">{i}</span>
          </label>
        ))}
      </div>
      {alert && (
        <p className="scale__alert">
          <Icon name="crit" size={16} />
          {alertText ?? 'Por encima de 3: baja la carga y no fuerces.'}
        </p>
      )}
    </fieldset>
  )
}

/* ───────────────────────── Collapsible ───────────────────────── */

interface CollapsibleProps {
  title: ReactNode
  meta?: ReactNode
  defaultOpen?: boolean
  children: ReactNode
  className?: string
}

/** Sección plegable con <details> nativo. */
export function Collapsible({ title, meta, defaultOpen, children, className }: CollapsibleProps) {
  return (
    <details className={cx('coll', className)} open={defaultOpen}>
      <summary className="coll__sum">
        <span className="coll__title">{title}</span>
        {meta && <span className="coll__meta">{meta}</span>}
        <Icon name="chevron" size={20} className="coll__chev" />
      </summary>
      <div className="coll__body">{children}</div>
    </details>
  )
}

/* ───────────────────────── EmptyState ───────────────────────── */

interface EmptyStateProps {
  icon?: IconName
  title: string
  children?: ReactNode
  action?: ReactNode
}

export function EmptyState({ icon = 'ruta', title, children, action }: EmptyStateProps) {
  return (
    <div className="empty">
      <Icon name={icon} size={28} />
      <p className="empty__title">{title}</p>
      {children && <p className="empty__text">{children}</p>}
      {action}
    </div>
  )
}

/* ───────────────────────── Utilidades pequeñas ───────────────────────── */

/** Anillo de progreso (kcal, proteína). `value`/`max` en las mismas unidades. */
export function Ring({
  value,
  max,
  size = 112,
  label,
  children,
}: {
  value: number
  max: number
  size?: number
  label: string
  children?: ReactNode
}) {
  const r = (size - 14) / 2
  const c = 2 * Math.PI * r
  const pct = max > 0 ? Math.min(1, value / max) : 0
  return (
    <div className="ring" style={{ width: size, height: size }} role="img" aria-label={label}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} className="ring__bg" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          className="ring__fg"
          strokeDasharray={`${c * pct} ${c}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div className="ring__center">{children}</div>
    </div>
  )
}

/** Hook para respetar prefers-reduced-motion en lógica JS. */
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  )
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const on = () => setReduced(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  return reduced
}
