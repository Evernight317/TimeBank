import { useMemo, useState } from 'react'
import { CATEGORY_MAP } from '../data/categories'
import { useApp } from '../lib/store'
import { fmtDateCN, fmtMinutes, fmtSigned, parseClock, relativeDayLabel, todayISO, weekdayLabel } from '../lib/date'
import { SubHeader, PageHead } from '../components/nav'
import { Button, Empty } from '../components/ui'
import { CompareRow } from '../components/charts'
import { LogModal, LogRow } from '../components/forms'
import { Icon } from '../components/icons'

export function RecordsPage() {
  const { state } = useApp()
  const [date, setDate] = useState(todayISO())
  const [open, setOpen] = useState(false)

  const dayLogs = state.logs
    .filter((l) => l.date === date)
    .sort((a, b) => parseClock(a.start) - parseClock(b.start))
  const dayTasks = state.tasks.filter((t) => t.date === date)

  const total = dayLogs.reduce((s, l) => s + l.minutes, 0)
  const effective = dayLogs
    .filter((l) => l.category === 'study' || l.category === 'work')
    .reduce((s, l) => s + l.minutes, 0)

  const comparisons = useMemo(() => {
    return dayTasks
      .filter((t) => t.category !== 'sleep')
      .map((t) => {
        const log = state.logs.find((l) => l.taskId === t.id)
        return log ? { task: t, log } : null
      })
      .filter((x): x is NonNullable<typeof x> => Boolean(x))
      .sort((a, b) => parseClock(a.log.start) - parseClock(b.log.start))
  }, [dayTasks, state.logs])

  const maxCompare = Math.max(60, ...comparisons.flatMap((c) => [c.task.plannedMinutes, c.log.minutes]))
  const delta = comparisons.reduce((s, c) => s + (c.log.minutes - c.task.plannedMinutes), 0)

  return (
    <div className="screen">
      <SubHeader
        title="时间记录"
        onBack={() => (window.location.hash = '#/today')}
        right={
          <button className="round-btn solid" onClick={() => setOpen(true)} aria-label="记录时间">
            <Icon name="plus" size={17} />
          </button>
        }
      />

      <PageHead title="记录，才看得见" sub="计划是意图，记录才是事实。差距就是可以优化的地方。" />

      <div className="row between" style={{ gap: 8 }}>
        <input
          className="input"
          type="date"
          style={{ width: 'auto', flex: 1, padding: '8px 10px', fontSize: 12 }}
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
        <Button size="sm" onClick={() => setDate(todayISO())}>
          今天
        </Button>
      </div>

      <div className="metric-grid">
        <div className="metric-cell">
          <div className="k">记录总时长</div>
          <div className="v">{fmtMinutes(total)}</div>
          <div className="d">{dayLogs.length} 条记录</div>
        </div>
        <div className="metric-cell">
          <div className="k">有效投入</div>
          <div className="v">{fmtMinutes(effective)}</div>
          <div className="d">学习 + 工作</div>
        </div>
        <div className="metric-cell">
          <div className="k">达成安排</div>
          <div className="v">
            {comparisons.length}
            <small>/ {dayTasks.length}</small>
          </div>
          <div className="d">已记录 / 已安排</div>
        </div>
        <div className="metric-cell">
          <div className="k">相对计划的偏差</div>
          <div className="v" style={{ color: delta > 0 ? 'var(--amber)' : 'var(--green)' }}>
            {fmtSigned(delta)}
          </div>
          <div className="d">正数代表超时</div>
        </div>
      </div>

      <section className="block">
        <div className="block-head">
          <h2>计划 vs 实际</h2>
          <span className="meta">{relativeDayLabel(date)}</span>
        </div>
        <div className="card">
          {comparisons.length === 0 ? (
            <Empty title="还没有可对比的记录" hint="完成安排时顺手记录实际用时，这里会显示偏差。" />
          ) : (
            comparisons.map(({ task, log }) => (
              <CompareRow
                key={task.id}
                label={task.title}
                glyph={CATEGORY_MAP[task.category].glyph}
                color={CATEGORY_MAP[task.category].color}
                planned={task.plannedMinutes}
                actual={log.minutes}
                max={maxCompare}
              />
            ))
          )}
        </div>
      </section>

      <section className="block">
        <div className="block-head">
          <h2>{fmtDateCN(date)} · {weekdayLabel(date)}</h2>
          <span className="meta">{dayLogs.length} 条</span>
        </div>
        <div className="card">
          {dayLogs.length === 0 ? (
            <Empty
              title="暂无记录"
              hint="哪怕只记一笔 20 分钟，也比凭感觉更接近事实。"
              action={
                <Button size="sm" variant="primary" onClick={() => setOpen(true)} style={{ marginTop: 8 }}>
                  补录一笔
                </Button>
              }
            />
          ) : (
            dayLogs.map((l) => <LogRow key={l.id} log={l} />)
          )}
        </div>
      </section>

      <p className="footnote">记录不需要精确到分钟，但需要持续。连续性比精度更重要。</p>

      <LogModal open={open} onClose={() => setOpen(false)} date={date} />
    </div>
  )
}
