import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from 'react'
import { useEffect } from 'react'

export function Card({
  children,
  className = '',
  style,
  tint = false,
  as: As = 'div',
}: {
  children: ReactNode
  className?: string
  style?: CSSProperties
  tint?: boolean
  as?: 'section' | 'div' | 'article'
}) {
  return (
    <As className={`card ${tint ? 'tint' : ''} ${className}`} style={style}>
      {children}
    </As>
  )
}

export function SectionHead({
  title,
  hint,
  action,
}: {
  title: string
  hint?: string
  action?: ReactNode
}) {
  return (
    <div className="block-head">
      <div className="row" style={{ gap: 8, alignItems: 'baseline', flexWrap: 'wrap' }}>
        <h2>{title}</h2>
        {hint && <span className="meta">{hint}</span>}
      </div>
      {action}
    </div>
  )
}

export function Stat({
  label,
  value,
  unit,
  hint,
  tone = 'default',
}: {
  label: string
  value: string
  unit?: string
  hint?: string
  tone?: 'default' | 'good' | 'warn' | 'bad'
}) {
  return (
    <div className={`stat stat-${tone}`}>
      <span className="stat-label">{label}</span>
      <div className="stat-value">
        <span>{value}</span>
        {unit && <em>{unit}</em>}
      </div>
      {hint && <span className="stat-hint">{hint}</span>}
    </div>
  )
}

export function Tag({
  children,
  tone = 'neutral',
}: {
  children: ReactNode
  tone?: 'neutral' | 'good' | 'warn' | 'bad' | 'accent'
}) {
  const cls =
    tone === 'good'
      ? 'pill pill-done'
      : tone === 'warn'
        ? 'pill pill-warn'
        : tone === 'bad'
          ? 'pill pill-bad'
          : tone === 'accent'
            ? 'pill pill-navy'
            : 'pill pill-idle'
  return <span className={cls}>{children}</span>
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost' | 'quiet' | 'danger'
  size?: 'sm' | 'md'
  block?: boolean
}

export function Button({
  variant = 'ghost',
  size = 'md',
  block = false,
  className = '',
  ...rest
}: ButtonProps) {
  return (
    <button
      className={`btn btn-${variant} btn-${size} ${block ? 'btn-block' : ''} ${className}`}
      {...rest}
    />
  )
}

export function Empty({
  title,
  hint,
  action,
}: {
  title: string
  hint?: string
  action?: ReactNode
}) {
  return (
    <div className="empty">
      <div className="empty-mark">◷</div>
      <strong>{title}</strong>
      {hint && <p>{hint}</p>}
      {action}
    </div>
  )
}

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  wide = false,
}: {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  footer?: ReactNode
  wide?: boolean
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, onClose])

  if (!open) return null
  return (
    <div className="overlay" onMouseDown={onClose}>
      <div
        className="sheet"
        style={wide ? { maxWidth: 520 } : undefined}
        onMouseDown={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <header className="sheet-head">
          <h3>{title}</h3>
          <button className="icon-btn" onClick={onClose} aria-label="关闭">
            ✕
          </button>
        </header>
        <div className="sheet-body">{children}</div>
        {footer && <footer className="sheet-foot">{footer}</footer>}
      </div>
    </div>
  )
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: ReactNode
}) {
  return (
    <label className="field">
      <span className="field-label">
        {label}
        {hint && <i>{hint}</i>}
      </span>
      {children}
    </label>
  )
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: Array<{ value: T; label: string }>
  value: T
  onChange: (value: T) => void
}) {
  return (
    <div className="segmented" role="tablist">
      {options.map((o) => (
        <button
          key={o.value}
          role="tab"
          aria-selected={o.value === value}
          className={o.value === value ? 'on' : ''}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function Progress({
  value,
  max,
  color,
  height = 8,
}: {
  value: number
  max: number
  color?: string
  height?: number
}) {
  const ratio = max > 0 ? Math.min(1, value / max) : 0
  return (
    <div className="progress" style={{ height }}>
      <span
        style={{
          width: `${ratio * 100}%`,
          background: color ?? 'var(--green)',
        }}
      />
    </div>
  )
}
