import type { ReactNode } from 'react'
import { BrandMark, Icon } from './icons'

export function BrandHeader({ right }: { right?: ReactNode }) {
  return (
    <header className="app-head">
      <div className="brand">
        <div className="brand-mark">
          <BrandMark size={16} />
        </div>
        <div className="brand-text">
          <b>时间银行</b>
          <span>TIME BANK</span>
        </div>
      </div>
      <div className="head-actions">{right}</div>
    </header>
  )
}

export function SubHeader({
  title,
  onBack,
  right,
}: {
  title: string
  onBack?: () => void
  right?: ReactNode
}) {
  return (
    <header className="app-head">
      <div className="row" style={{ gap: 10 }}>
        {onBack && (
          <button className="back-btn" onClick={onBack} aria-label="返回">
            <Icon name="back" size={17} />
          </button>
        )}
        <strong style={{ fontSize: 14, fontWeight: 650 }}>{title}</strong>
      </div>
      <div className="head-actions">{right}</div>
    </header>
  )
}

export function PageHead({
  title,
  sub,
  action,
}: {
  title: string
  sub?: ReactNode
  action?: ReactNode
}) {
  return (
    <div className="page-head">
      <div className="row between" style={{ alignItems: 'flex-start' }}>
        <h1>{title}</h1>
        {action}
      </div>
      {sub && <p className="sub">{sub}</p>}
    </div>
  )
}
