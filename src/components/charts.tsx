import { useId } from 'react'

export interface Slice {
  id: string
  label: string
  value: number
  color: string
}

export function Donut({
  slices,
  total,
  size = 220,
  thickness = 22,
  centerTop,
  centerMain,
  centerSub,
  onHover,
}: {
  slices: Slice[]
  total: number
  size?: number
  thickness?: number
  centerTop?: string
  centerMain: string
  centerSub?: string
  onHover?: (id: string | null) => void
}) {
  const r = (size - thickness) / 2
  const c = 2 * Math.PI * r
  const safeTotal = total > 0 ? total : 1
  const gap = slices.length > 1 ? 3 : 0

  let offset = 0
  const arcs = slices
    .filter((s) => s.value > 0)
    .map((s) => {
      const len = Math.max(0, (s.value / safeTotal) * c - gap)
      const arc = { ...s, len, offset }
      offset += (s.value / safeTotal) * c
      return arc
    })

  return (
    <div className="donut" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--line-soft)"
          strokeWidth={thickness}
        />
        <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
          {arcs.map((a) => (
            <circle
              key={a.id}
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke={a.color}
              strokeWidth={thickness}
              strokeLinecap="round"
              strokeDasharray={`${a.len} ${c - a.len}`}
              strokeDashoffset={-a.offset}
              className="donut-arc"
              onMouseEnter={() => onHover?.(a.id)}
              onMouseLeave={() => onHover?.(null)}
            >
              <title>{`${a.label} · ${Math.round(a.value)} 分钟`}</title>
            </circle>
          ))}
        </g>
      </svg>
      <div className="donut-center">
        {centerTop && <span className="donut-top">{centerTop}</span>}
        <strong>{centerMain}</strong>
        {centerSub && <span className="donut-sub">{centerSub}</span>}
      </div>
    </div>
  )
}

export function Sparkline({
  data,
  width = 260,
  height = 64,
  color = 'var(--accent)',
  showArea = true,
}: {
  data: number[]
  width?: number
  height?: number
  color?: string
  showArea?: boolean
}) {
  const id = useId().replace(/:/g, '')
  if (!data.length) return null
  if (data.length === 1) {
    const max = Math.max(data[0], 1)
    const cy = height - 6 - (data[0] / max) * (height - 16)
    return (
      <svg className="sparkline" width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <line x1="4" y1={cy} x2={width - 4} y2={cy} stroke={color} strokeWidth="2" strokeDasharray="4 4" />
        <circle cx={width - 4} cy={cy} r="3" fill={color} />
      </svg>
    )
  }
  const max = Math.max(...data, 1)
  const min = Math.min(...data, 0)
  const pad = 4
  const stepX = (width - pad * 2) / Math.max(1, data.length - 1)
  const y = (v: number) =>
    height - pad - ((v - min) / Math.max(1, max - min)) * (height - pad * 2)
  const points = data.map((v, i) => `${pad + i * stepX},${y(v)}`)
  const line = points.join(' ')
  const area = `${pad},${height - pad} ${line} ${width - pad},${height - pad}`

  return (
    <svg
      className="sparkline"
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={`g-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.22" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {showArea && <polygon points={area} fill={`url(#g-${id})`} />}
      <polyline
        points={line}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  )
}

export function MiniBars({
  data,
  max,
  height = 56,
  color = 'var(--accent)',
}: {
  data: number[]
  max?: number
  height?: number
  color?: string
}) {
  const peak = max ?? Math.max(...data, 1)
  return (
    <div className="mini-bars" style={{ height }}>
      {data.map((v, i) => (
        <span
          key={i}
          style={{
            height: `${Math.max(6, (v / peak) * height)}px`,
            background: color,
            opacity: v === 0 ? 0.18 : 0.35 + 0.65 * (v / peak),
          }}
        />
      ))}
    </div>
  )
}

export function HourBars({
  hourly,
  peakStart,
  peakEnd,
}: {
  hourly: number[]
  peakStart: number
  peakEnd: number
}) {
  const max = Math.max(...hourly, 1)
  return (
    <div className="hour-bars">
      {hourly.map((v, h) => {
        const active = h >= peakStart && h < peakEnd
        return (
          <div className="hour-col" key={h} title={`${h}:00 · ${Math.round(v)} 分钟`}>
            <div className="hour-track">
              <span
                className={active ? 'on' : ''}
                style={{ height: `${Math.max(2, (v / max) * 100)}%` }}
              />
            </div>
            {h % 3 === 0 && <em>{h}</em>}
          </div>
        )
      })}
    </div>
  )
}

export function CompareRow({
  label,
  planned,
  actual,
  max,
  color,
  glyph,
}: {
  label: string
  planned: number
  actual: number
  max: number
  color: string
  glyph?: string
}) {
  const over = actual > planned
  return (
    <div className="compare-row">
      <span className="compare-label">
        {glyph && <i style={{ color }}>{glyph}</i>}
        {label}
      </span>
      <div className="compare-bars">
        <span className="bar planned" style={{ width: `${(planned / max) * 100}%` }} />
        <span
          className="bar actual"
          style={{ width: `${(Math.min(actual, max) / max) * 100}%`, background: color }}
        />
      </div>
      <span className={`compare-delta ${over ? 'over' : 'under'}`}>
        {actual - planned > 0 ? '+' : actual - planned < 0 ? '−' : ''}
        {Math.abs(actual - planned)}
      </span>
    </div>
  )
}
