import { useMemo } from 'react'
import { CATEGORY_MAP } from '../data/categories'
import { useApp } from '../lib/store'
import { buildPersona } from '../lib/insights'
import {
  categoryAccuracy,
  completionStats,
  hourlyEffective,
  isEffective,
  logsBetween,
  rangeDates,
} from '../lib/analytics'
import { addDays, fmtMinutes, fmtDateCN, toISODate } from '../lib/date'
import { Card, Progress, SectionHead, Tag } from '../components/ui'
import { HourBars, Sparkline } from '../components/charts'
import { Icon } from '../components/icons'

export function PersonaPage() {
  const { state } = useApp()

  const days = 30
  const now = new Date()
  const from = toISODate(addDays(now, -(days - 1)))
  const to = toISODate(now)
  const dates = useMemo(() => rangeDates(from, to), [from, to])
  const persona = useMemo(() => buildPersona(state, { days }), [state])
  const acc = useMemo(() => categoryAccuracy(state.tasks, state.logs, from, to), [state, from, to])
  const comp = useMemo(() => completionStats(state.tasks, from, to), [state, from, to])
  const hourly = useMemo(() => hourlyEffective(state.logs, from, to), [state, from, to])
  const daily = dates.map((d) =>
    logsBetween(state.logs, d, d)
      .filter((l) => isEffective(l.category))
      .reduce((s, l) => s + l.minutes, 0),
  )

  const leak = persona.topLeak
  const overrun = persona.mostOverrun
  const records = state.logs.length
  const maturity = Math.min(100, Math.round((new Set(state.logs.map((l) => l.date)).size / 21) * 100))

  const formatWindow = (s: number, e: number) =>
    `${String(s).padStart(2, '0')}:00—${String(e).padStart(2, '0')}:00`

  return (
    <div className="page">
      <div className="topbar">
        <div>
          <span className="eyebrow">个人时间画像</span>
          <h1 className="page-title">这是我使用时间的方式</h1>
          <p className="page-sub">
            基于最近 {days} 天 · {fmtDateCN(from)} 至 {fmtDateCN(to)}。用得越久，它越像你。
          </p>
        </div>
        <div className="topbar-actions">
          <Tag tone="accent">样本 {days} 天</Tag>
          <Tag tone="neutral">{records} 条记录</Tag>
        </div>
      </div>

      <div className="persona-grid" style={{ marginBottom: 16 }}>
        <div className="persona-cell">
          <div className="k">
            <Icon name="spark" size={13} /> 高效时间
          </div>
          <div className="v">{formatWindow(persona.peak.start, persona.peak.end)}</div>
          <div className="d">有效投入最集中的连续 3 小时</div>
        </div>
        <div className="persona-cell">
          <div className="k">最佳连续专注</div>
          <div className="v">
            {persona.focusMinutes} <small>分钟</small>
          </div>
          <div className="d">完成后你实际能保持的时长中位数</div>
        </div>
        <div className="persona-cell">
          <div className="k">平均延期率</div>
          <div className="v">
            {Math.round(comp.delayRate * 100)}
            <small>%</small>
          </div>
          <div className="d">
            {comp.delayed} 次延期 · {comp.missed} 次未完成
          </div>
        </div>
        <div className="persona-cell">
          <div className="k">时间估算准确度</div>
          <div className="v">
            {Math.round(persona.accuracy * 100)}
            <small>%</small>
          </div>
          <div className="d">计划与实际的平均接近程度</div>
        </div>
        <div className="persona-cell">
          <div className="k">最常出现的时间黑洞</div>
          <div className="v" style={{ fontSize: 21 }}>
            {leak ? CATEGORY_MAP[leak.category].label : '尚未显现'}
          </div>
          <div className="d">{leak ? `累计多消耗 ${fmtMinutes(leak.delta)}` : '继续记录以识别'}</div>
        </div>
        <div className="persona-cell">
          <div className="k">最容易超时的任务</div>
          <div className="v" style={{ fontSize: 21 }}>
            {overrun ? CATEGORY_MAP[overrun.category].label : '尚未显现'}
          </div>
          <div className="d">{overrun ? `实际是计划的 ${Math.round(overrun.ratio * 100)}%` : '继续记录以识别'}</div>
        </div>
      </div>

      <div className="split">
        <div className="stack">
          <Card>
            <SectionHead
              title="你的一天如何分布"
              hint="按小时统计有效投入（学习 + 工作），绿色为高效窗口"
            />
            <HourBars hourly={hourly} peakStart={persona.peak.start} peakEnd={persona.peak.end} />
            <div className="row" style={{ marginTop: 12, gap: 20 }}>
              <span className="faint" style={{ fontSize: 11.5 }}>
                0 时
              </span>
              <span className="faint" style={{ fontSize: 11.5, marginLeft: 'auto' }}>
                24 时
              </span>
            </div>
          </Card>

          <Card>
            <SectionHead title="有效投入的 30 天轨迹" hint={`日均 ${fmtMinutes(persona.effectivePerDay)}`} />
            <Sparkline data={daily} height={86} />
            <div className="row" style={{ marginTop: 12, gap: 24 }}>
              <div>
                <div className="stat-label">最高一天</div>
                <div className="stat-value" style={{ fontSize: 22 }}>
                  {fmtMinutes(Math.max(0, ...daily))}
                </div>
              </div>
              <div>
                <div className="stat-label">有记录的天数</div>
                <div className="stat-value" style={{ fontSize: 22 }}>
                  {state.logs.length ? new Set(state.logs.map((l) => l.date)).size : 0}
                  <em>天</em>
                </div>
              </div>
              <div>
                <div className="stat-label">完成率</div>
                <div className="stat-value" style={{ fontSize: 22 }}>
                  {Math.round(comp.completionRate * 100)}
                  <em>%</em>
                </div>
              </div>
            </div>
          </Card>
        </div>

        <div className="stack">
          <Card>
            <SectionHead title="画像成熟度" hint="记录越连续，画像越可信" />
            <div className="row between" style={{ marginBottom: 8 }}>
              <span style={{ fontSize: 13 }}>
                {maturity >= 80 ? '已经很像你了' : maturity >= 40 ? '正在形成' : '刚刚开始'}
              </span>
              <span className="num muted" style={{ fontSize: 12.5 }}>
                {maturity}%
              </span>
            </div>
            <Progress value={maturity} max={100} height={9} />
            <p className="muted" style={{ fontSize: 12, marginTop: 10 }}>
              建议连续记录 21 天以上，画像会逐渐稳定。目前有记录的日期为{' '}
              {new Set(state.logs.map((l) => l.date)).size} 天。
            </p>
          </Card>

          <Card>
            <SectionHead title="品类偏差" hint="实际 ÷ 计划" />
            {acc.length === 0 ? (
              <p className="muted" style={{ fontSize: 13 }}>
                暂无足够记录
              </p>
            ) : (
              <div className="stack" style={{ gap: 9 }}>
                {acc.slice(0, 6).map((a) => {
                  const cat = CATEGORY_MAP[a.category]
                  const over = a.ratio > 1.05
                  return (
                    <div key={a.category}>
                      <div className="row between" style={{ fontSize: 12.5 }}>
                        <span className="row" style={{ gap: 6 }}>
                          <span className="dot" style={{ background: cat.color }} />
                          {cat.label}
                          <span className="faint" style={{ fontSize: 11 }}>
                            {a.count} 次
                          </span>
                        </span>
                        <span style={{ color: over ? 'var(--bad)' : 'var(--accent)' }}>
                          {Math.round(a.ratio * 100)}%
                        </span>
                      </div>
                      <div className="progress" style={{ height: 4, marginTop: 4 }}>
                        <span
                          style={{
                            width: `${Math.min(100, (a.ratio / 2) * 100)}%`,
                            background: over ? 'var(--bad)' : cat.color,
                          }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </Card>

          <Card tint>
            <div className="row" style={{ gap: 10, alignItems: 'flex-start' }}>
              <Icon name="persona" size={18} />
              <div>
                <strong style={{ fontSize: 13 }}>画像不是标签</strong>
                <p className="muted" style={{ fontSize: 12.5, marginTop: 4, lineHeight: 1.8 }}>
                  它只是过去 30 天的统计快照。生活节奏变化时，画像也应该随之变化 —— 这正是它有价值的原因。
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
