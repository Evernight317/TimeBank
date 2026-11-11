import { useMemo, useState } from 'react'
import { CATEGORY_MAP, CATEGORY_ORDER } from '../data/categories'
import { useApp } from '../lib/store'
import { categoryMinutes, lastNDates, logsBetween } from '../lib/analytics'
import { fmtMinutes, todayISO, weekdayLabel } from '../lib/date'
import { BrandHeader, PageHead } from '../components/nav'
import { Button, Segmented } from '../components/ui'
import { Donut } from '../components/charts'
import { Icon } from '../components/icons'

type View = 'day' | 'week'

export function AssetsPage() {
  const { state } = useApp()
  const [view, setView] = useState<View>('day')
  const [hover, setHover] = useState<string | null>(null)

  const today = todayISO()
  const weekDates = useMemo(() => lastNDates(7), [])
  const dates = view === 'day' ? [today] : weekDates
  const from = dates[0]
  const to = dates[dates.length - 1]

  const logs = useMemo(() => logsBetween(state.logs, from, to), [state.logs, from, to])
  const totals = categoryMinutes(logs)
  const total = logs.reduce((s, l) => s + l.minutes, 0)
  const denominator = view === 'day' ? 1440 : total || 1

  const slices = CATEGORY_ORDER.map((c) => ({
    id: c,
    label: CATEGORY_MAP[c].label,
    value: totals[c],
    color: CATEGORY_MAP[c].color,
  }))
    .filter((s) => s.value > 0)
    .sort((a, b) => b.value - a.value)

  const rows: Array<{
    id: string
    label: string
    color: string
    value: number
    pct: number
  }> = slices.map((s) => ({
    id: s.id,
    label: s.label,
    color: s.color,
    value: s.value,
    pct: denominator ? s.value / denominator : 0,
  }))
  if (view === 'day' && total < 1440) {
    rows.push({
      id: 'unlogged',
      label: '未记录',
      color: '#dcdcd4',
      value: 1440 - total,
      pct: (1440 - total) / 1440,
    })
  }

  return (
    <div className="screen">
      <BrandHeader
        right={
          <button
            className="round-btn solid"
            onClick={() => (window.location.hash = '#/create')}
            aria-label="创建日程"
          >
            <Icon name="plus" size={17} />
          </button>
        }
      />

      <PageHead title="你的时间，流向哪里" sub="时间资产 · 24 小时时间本金" />

      <Segmented<View>
        value={view}
        onChange={setView}
        options={[
          { value: 'day', label: '日视图' },
          { value: 'week', label: '周视图' },
        ]}
      />

      <div className="card" style={{ marginTop: 12, padding: '20px 16px 16px' }}>
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <Donut
            slices={slices}
            total={denominator}
            size={196}
            thickness={20}
            centerTop={view === 'day' ? 'HOURS' : '7 天'}
            centerMain={
              view === 'day' ? '24' : `${Math.round(total / 60)}`
            }
            centerSub={view === 'day' ? '小时时间本金' : '小时已记录'}
            onHover={setHover}
          />
        </div>
        <div
          className="row"
          style={{ justifyContent: 'center', gap: 14, marginTop: 14, fontSize: 11.5, color: 'var(--muted)' }}
        >
          <span>
            已记录 <b style={{ color: 'var(--ink)' }}>{fmtMinutes(total)}</b>
          </span>
          <span className="faint">·</span>
          <span>
            {view === 'day' ? '未记录' : '日均'}{' '}
            <b style={{ color: 'var(--ink)' }}>
              {view === 'day' ? fmtMinutes(Math.max(0, 1440 - total)) : fmtMinutes(total / 7)}
            </b>
          </span>
        </div>
      </div>

      <section className="block">
        <div className="block-head">
          <h2>时间流向</h2>
          <span className="meta">{view === 'day' ? '今天' : '近 7 天'}</span>
        </div>
        <div className="card">
          <div className="flow-grid">
            {rows.map((r) => (
              <div
                className="flow-item"
                key={r.id}
                onMouseEnter={() => setHover(r.id)}
                onMouseLeave={() => setHover(null)}
                style={{ opacity: hover && hover !== r.id ? 0.55 : 1, transition: 'opacity .15s' }}
              >
                <span className="swatch" style={{ background: r.color }} />
                <span className="name">{r.label}</span>
                <span className="val">
                  {fmtMinutes(r.value)}
                  <i>{Math.round(r.pct * 100)}%</i>
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div style={{ marginTop: 14 }}>
        <Button block onClick={() => (window.location.hash = '#/replay')}>
          <Icon name="replay" size={15} />
          看看昨天如何度过
        </Button>
      </div>

      <p className="footnote">
        {view === 'day'
          ? `统计口径：${today} ${weekdayLabel(today)}，以 1440 分钟为本金。`
          : `统计口径：近 7 天（${from} 至 ${to}），占比按已记录时长计算。`}
        <br />
        未记录不代表没有发生，只代表它还没进入你的账本。
      </p>
    </div>
  )
}
