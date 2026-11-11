import { useMemo, useState } from 'react'
import { CATEGORY_MAP, CATEGORY_ORDER } from '../data/categories'
import { useApp } from '../lib/store'
import { categoryMinutes, lastNDates, logsBetween } from '../lib/analytics'
import { fmtDateCN, fmtMinutes } from '../lib/date'
import { Card, SectionHead, Segmented, Stat, Tag } from '../components/ui'
import { Donut, Sparkline } from '../components/charts'
import { Icon } from '../components/icons'

type Mode = 'today' | '7' | '30'

export function AssetsPage() {
  const { state } = useApp()
  const [mode, setMode] = useState<Mode>('today')
  const [hover, setHover] = useState<string | null>(null)

  const days = mode === 'today' ? 1 : mode === '7' ? 7 : 30
  const dates = useMemo(() => lastNDates(days), [days])
  const from = dates[0]
  const to = dates[dates.length - 1]
  const rangeLogs = useMemo(() => logsBetween(state.logs, from, to), [state.logs, from, to])
  const totals = categoryMinutes(rangeLogs)
  const totalMinutes = rangeLogs.reduce((s, l) => s + l.minutes, 0)
  const denominator = mode === 'today' ? 1440 : totalMinutes

  // 趋势固定看最近 14 天，避免「今天」模式下只有单点
  const trendDates = useMemo(() => lastNDates(14), [])
  const trendLogs = useMemo(
    () => logsBetween(state.logs, trendDates[0], trendDates[trendDates.length - 1]),
    [state.logs, trendDates],
  )
  const dailyEffective = trendDates.map((d) =>
    trendLogs
      .filter((l) => l.date === d && (l.category === 'study' || l.category === 'work'))
      .reduce((s, l) => s + l.minutes, 0),
  )
  const trendSum = dailyEffective.reduce((s, v) => s + v, 0)

  const slices = CATEGORY_ORDER.map((c) => ({
    id: c,
    label: CATEGORY_MAP[c].label,
    value: totals[c],
    color: CATEGORY_MAP[c].color,
  }))
    .filter((s) => s.value > 0)
    .sort((a, b) => b.value - a.value)

  const avgPerDay = totalMinutes / days
  const effectiveTotal = rangeLogs
    .filter((l) => l.category === 'study' || l.category === 'work')
    .reduce((s, l) => s + l.minutes, 0)
  const leakTotal = totals.entertainment ?? 0
  const highlight = hover ? CATEGORY_MAP[hover as keyof typeof CATEGORY_MAP] : null

  return (
    <div className="page">
      <div className="topbar">
        <div>
          <span className="eyebrow">时间资产</span>
          <h1 className="page-title">24 小时流向了哪里</h1>
          <p className="page-sub">每天的本金都是 1440 分钟。你无法增加它，只能决定把它分配到哪里。</p>
        </div>
        <div className="topbar-actions">
          <Segmented<Mode>
            value={mode}
            onChange={setMode}
            options={[
              { value: 'today', label: '今天' },
              { value: '7', label: '近 7 天' },
              { value: '30', label: '近 30 天' },
            ]}
          />
        </div>
      </div>

      <div className="grid grid-4" style={{ marginBottom: 16 }}>
        <Card>
          <Stat
            label={mode === 'today' ? '今日已记录' : `${days} 天总记录`}
            value={fmtMinutes(totalMinutes)}
            hint={
              mode === 'today'
                ? `占 24h 的 ${Math.round((totalMinutes / 1440) * 100)}%`
                : `日均 ${fmtMinutes(avgPerDay)}`
            }
          />
        </Card>
        <Card>
          <Stat label="有效投入" value={fmtMinutes(effectiveTotal)} hint="学习 + 工作" tone="good" />
        </Card>
        <Card>
          <Stat
            label="娱乐消耗"
            value={fmtMinutes(leakTotal)}
            hint={totalMinutes ? `占已记录 ${Math.round((leakTotal / totalMinutes) * 100)}%` : undefined}
            tone={leakTotal > totalMinutes * 0.2 ? 'warn' : 'default'}
          />
        </Card>
        <Card>
          <Stat
            label={mode === 'today' ? '尚未记录' : '日均未记录'}
            value={
              mode === 'today'
                ? fmtMinutes(Math.max(0, 1440 - totalMinutes))
                : fmtMinutes(Math.max(0, 1440 - avgPerDay))
            }
            hint={mode === 'today' ? '空白也是一种信息' : '平均每天'}
          />
        </Card>
      </div>

      <div className="split">
        <div className="stack">
          <Card>
            <SectionHead
              title={mode === 'today' ? '今日时间资产（24 小时本金）' : `${days} 天时间资产构成`}
              hint="按类别统计实际记录"
              action={<Tag tone="accent">{fmtDateCN(to)}</Tag>}
            />
            <div
              className="row wrap"
              style={{ gap: 28, alignItems: 'center', justifyContent: 'center', padding: '6px 0 18px' }}
            >
              <Donut
                slices={slices}
                total={denominator}
                size={224}
                thickness={23}
                centerTop={mode === 'today' ? '剩余未记录' : '已记录'}
                centerMain={
                  mode === 'today'
                    ? fmtMinutes(Math.max(0, 1440 - totalMinutes))
                    : fmtMinutes(totalMinutes)
                }
                centerSub={
                  mode === 'today'
                    ? `已记录 ${fmtMinutes(totalMinutes)}`
                    : `日均 ${fmtMinutes(avgPerDay)}`
                }
                onHover={setHover}
              />
              <div className="legend" style={{ minWidth: 250, flex: 1 }}>
                {slices.map((s) => (
                  <div
                    key={s.id}
                    className="legend-row"
                    onMouseEnter={() => setHover(s.id)}
                    onMouseLeave={() => setHover(null)}
                  >
                    <span className="legend-swatch" style={{ background: s.color }} />
                    <span className="legend-name">{s.label}</span>
                    <span className="legend-min">{fmtMinutes(s.value)}</span>
                    <span className="legend-pct">
                      {denominator ? Math.round((s.value / denominator) * 100) : 0}%
                    </span>
                  </div>
                ))}
                {mode === 'today' && totalMinutes < 1440 && (
                  <div className="legend-row">
                    <span className="legend-swatch" style={{ background: 'var(--line)' }} />
                    <span className="legend-name muted">未记录</span>
                    <span className="legend-min">{fmtMinutes(1440 - totalMinutes)}</span>
                    <span className="legend-pct">
                      {Math.round(((1440 - totalMinutes) / 1440) * 100)}%
                    </span>
                  </div>
                )}
              </div>
            </div>
            {highlight && (
              <div className="notice">
                <Icon name="spark" size={15} />
                <span>
                  「{highlight.label}」在{mode === 'today' ? '今天' : `这 ${days} 天`}共记录{' '}
                  {fmtMinutes(totals[highlight.id])}，平均每天 {fmtMinutes(totals[highlight.id] / days)}。
                </span>
              </div>
            )}
          </Card>

          <Card>
            <SectionHead title="有效投入趋势" hint="最近 14 天 · 每天学习 + 工作实际分钟" />
            <Sparkline data={dailyEffective} height={84} />
            <div className="row between" style={{ marginTop: 10 }}>
              <span className="faint" style={{ fontSize: 11.5 }}>
                14 天前
              </span>
              <span className="faint" style={{ fontSize: 11.5 }}>
                今天
              </span>
            </div>
            <div className="row" style={{ marginTop: 16, gap: 26 }}>
              <Stat label="日均有效" value={fmtMinutes(trendSum / trendDates.length)} tone="good" />
              <Stat label="最高一天" value={fmtMinutes(Math.max(0, ...dailyEffective))} />
              <Stat
                label="空白天数"
                value={`${dailyEffective.filter((v) => v === 0).length}`}
                unit="天"
                hint="没有有效投入记录"
              />
            </div>
          </Card>
        </div>

        <div className="stack">
          <Card>
            <SectionHead title="类别明细" hint="占比与日均" />
            <div className="stack" style={{ gap: 13 }}>
              {CATEGORY_ORDER.filter((c) => totals[c] > 0)
                .sort((a, b) => totals[b] - totals[a])
                .map((c) => {
                  const cat = CATEGORY_MAP[c]
                  const pct = denominator ? (totals[c] / denominator) * 100 : 0
                  return (
                    <div key={c}>
                      <div className="row between" style={{ fontSize: 12.5, marginBottom: 4 }}>
                        <span className="row" style={{ gap: 6 }}>
                          <span className="dot" style={{ background: cat.color }} />
                          {cat.label}
                          <span className="faint" style={{ fontSize: 11 }}>
                            日均 {fmtMinutes(totals[c] / days)}
                          </span>
                        </span>
                        <span className="num muted">{pct.toFixed(1)}%</span>
                      </div>
                      <div className="progress" style={{ height: 5 }}>
                        <span style={{ width: `${pct}%`, background: cat.color }} />
                      </div>
                    </div>
                  )
                })}
            </div>
          </Card>

          <Card tint>
            <div className="row" style={{ gap: 10, alignItems: 'flex-start' }}>
              <Icon name="insights" size={18} />
              <div>
                <strong style={{ fontSize: 13 }}>关于「未记录」</strong>
                <p className="muted" style={{ fontSize: 12.5, marginTop: 4, lineHeight: 1.8 }}>
                  未记录不代表没有发生，只代表它暂时没有进入你的账本。记录得越完整，后面的洞察就越可信。
                </p>
              </div>
            </div>
          </Card>

          <Card>
            <SectionHead title="本页口径" />
            <p className="muted" style={{ fontSize: 12.5, lineHeight: 1.9 }}>
              统计区间：{fmtDateCN(from)} — {fmtDateCN(to)}，共 {days} 天。
              {mode === 'today' ? ' 今日以 1440 分钟为本金计算占比。' : ' 占比以区间内已记录总时长计算。'}
            </p>
          </Card>
        </div>
      </div>
    </div>
  )
}
